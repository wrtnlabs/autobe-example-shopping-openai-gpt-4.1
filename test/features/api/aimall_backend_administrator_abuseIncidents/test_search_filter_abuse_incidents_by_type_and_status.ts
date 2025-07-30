import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";
import type { IPageIAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAbuseIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filter for abuse incidents (by type and resolved
 * flag).
 *
 * This E2E test seeds the backend with a set of abuse incidents covering
 * different `type` values ('coupon_stacking', 'self_referral',
 * 'velocity_anomaly') and attempts to also cover both resolved (true/false)
 * states. However, due to API limitation (no endpoint for marking incidents as
 * resolved), all seeded incidents will have `resolved: false`. The test then
 * exercises advanced filtering logic by type and resolved flag, and pagination
 * controls for admin dashboard use.
 *
 * Steps:
 *
 * 1. Seed incidents (API allows only `resolved: false`).
 *
 *    - 3 incidents each for each type, both "desired" resolved: true/false
 *    - All actual incidents will be unresolved (false)
 * 2. For each (type, resolved) filter:
 *
 *    - Search with PATCH (type/resolved)
 *    - Assert that only correct incidents (by ID) and counts are returned
 *    - Assert pagination metadata
 * 3. Test overall pagination (page/limit) and that returned data is from seeded
 *    set.
 *
 * Limitations:
 *
 * - No incident update/resolve endpoint: all seeded incidents are resolved:
 *   false.
 * - Filtering for resolved: true will always be empty with current API.
 *
 * This test covers realistic admin dashboard compliance and analytics
 * workflows, and validates backend query logic for incident review/triage.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_search_filter_abuse_incidents_by_type_and_status(
  connection: api.IConnection,
) {
  // 1. Seed a set of incidents covering all types and intended "resolved" variants.
  const types = ["coupon_stacking", "self_referral", "velocity_anomaly"];
  const resolvedVariants = [true, false];
  const created: IAimallBackendAbuseIncident[] = [];
  for (const type of types) {
    for (const resolved of resolvedVariants) {
      for (let i = 0; i < 3; ++i) {
        // Note: Can only set resolved: false via create API
        const detected_at = new Date(
          Date.now() - Math.floor(Math.random() * 1e7),
        ).toISOString();
        const incident =
          await api.functional.aimall_backend.administrator.abuseIncidents.create(
            connection,
            {
              body: {
                type,
                detected_at,
                customer_id: null,
                order_id: null,
                coupon_id: null,
                discount_campaign_id: null,
                details: `seed for ${type} - intended resolved=${resolved}`,
              } satisfies IAimallBackendAbuseIncident.ICreate,
            },
          );
        typia.assert(incident);
        // resolved will always be false in all created items.
        created.push(incident);
      }
    }
  }

  // 2. For each (type, resolved) filter combination, search and validate results
  for (const type of types) {
    for (const resolved of resolvedVariants) {
      const result =
        await api.functional.aimall_backend.administrator.abuseIncidents.search(
          connection,
          {
            body: {
              type,
              resolved,
              page: 1,
              limit: 10,
            } satisfies IAimallBackendAbuseIncident.IRequest,
          },
        );
      typia.assert(result);
      // Filter "created" by type and resolved actually present
      const expectData = created.filter(
        (i) => i.type === type && i.resolved === resolved,
      );
      TestValidator.equals(`count for type=${type} resolved=${resolved}`)(
        result.data.length,
      )(expectData.length);
      // IDs must be from seeded incidents
      for (const incident of result.data) {
        TestValidator.equals("type matches")(incident.type)(type);
        TestValidator.equals("resolved matches")(incident.resolved)(resolved);
        TestValidator.predicate("returned incident seeded")(
          created.some((i) => i.id === incident.id),
        );
      }
      TestValidator.equals(
        `pagination.limit type=${type} resolved=${resolved}`,
      )(result.pagination.limit)(10);
      TestValidator.equals(
        `pagination.current type=${type} resolved=${resolved}`,
      )(result.pagination.current)(1);
      TestValidator.equals(
        `pagination.records type=${type} resolved=${resolved}`,
      )(result.pagination.records)(expectData.length);
    }
  }

  // 3. Test global pagination
  const paged =
    await api.functional.aimall_backend.administrator.abuseIncidents.search(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination.limit global")(paged.pagination.limit)(5);
  TestValidator.equals("pagination.records global")(paged.pagination.records)(
    created.length,
  );
  for (const item of paged.data) {
    TestValidator.predicate("paged incident from seeded")(
      created.some((i) => i.id === item.id),
    );
  }
}
