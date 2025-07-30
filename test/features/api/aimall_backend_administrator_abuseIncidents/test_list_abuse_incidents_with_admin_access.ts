import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAbuseIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate that an administrator with proper access can list all abuse
 * incidents.
 *
 * This test ensures that abuse incident logging and listing is working
 * end-to-end:
 *
 * - Seed the system with a diverse set of incident logs via the POST endpoint.
 * - Confirm GET returns those newly seeded incidents, covering typical
 *   fraud/abuse scenarios:
 *
 *   - Type 'coupon_stacking' (coupon stacking abuse)
 *   - Type 'self_referral' (self-referral scenario)
 *   - Type 'velocity_anomaly' (velocity/frequency anomaly)
 * - Check that pagination structure is present on the GET result.
 * - Confirm all returned data matches the IAimallBackendAbuseIncident schema by
 *   assertion.
 * - Confirm as privileged (admin) user there are no access errors.
 *
 * Steps:
 *
 * 1. Seed three unique abuse incidents (types as above), capturing their UUIDs
 * 2. List all abuse incidents through the GET endpoint
 * 3. Assert the GET output includes all three originally seeded incidents by their
 *    "type" and presence of their IDs
 * 4. Validate returned records match the IAimallBackendAbuseIncident and
 *    pagination schema
 * 5. Confirm there are no access errors or HTTP errors
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_index(
  connection: api.IConnection,
) {
  // Step 1: Seed three unique abuse incidents (different types)
  const incidentTypes = [
    "coupon_stacking",
    "self_referral",
    "velocity_anomaly",
  ];
  const createdIncidents: IAimallBackendAbuseIncident[] = [];
  for (const type of incidentTypes) {
    const body: IAimallBackendAbuseIncident.ICreate = {
      type,
      detected_at: new Date().toISOString(),
    };
    const result =
      await api.functional.aimall_backend.administrator.abuseIncidents.create(
        connection,
        {
          body,
        },
      );
    typia.assert(result);
    createdIncidents.push(result);
  }

  // Step 2: List all abuse incidents as admin
  const list =
    await api.functional.aimall_backend.administrator.abuseIncidents.index(
      connection,
    );
  typia.assert(list);
  TestValidator.predicate("pagination present")(!!list.pagination);
  TestValidator.predicate("data array present")(Array.isArray(list.data));

  // Step 3: Assert new incidents are included in result by type and id
  for (const incident of createdIncidents) {
    const found = list.data.some(
      (item) => item.id === incident.id && item.type === incident.type,
    );
    TestValidator.predicate(
      `incident with type "${incident.type}" and ID "${incident.id}" is in get result`,
    )(found);
  }

  // Step 4: Validate full schema on each record
  for (const record of list.data) {
    typia.assert<IAimallBackendAbuseIncident>(record);
  }
}
