import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate API rejects creation of abuse incidents with missing required
 * fields.
 *
 * This test confirms that when required properties like `type` or `detected_at`
 * are omitted from the abuse incident creation request body (as performed by an
 * administrator), the API refuses the operation with a validation error,
 * ensuring data integrity.
 *
 * Steps:
 *
 * 1. Attempt to create an abuse incident omitting the required `type` property.
 *
 *    - Expect a validation error from the API.
 * 2. Attempt to create an abuse incident omitting the required `detected_at`
 *    property.
 *
 *    - Expect a validation error from the API.
 * 3. No incident should be created as a result of these failed requests.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_create_abuse_incident_missing_required_field(
  connection: api.IConnection,
) {
  // 1. Attempt creation with missing 'type' (required field)
  await TestValidator.error("missing required property: type")(async () => {
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      {
        body: {
          detected_at: typia.random<string & tags.Format<"date-time">>(),
          // type intentionally omitted for negative test
        } as any, // Bypassing type check intentionally for negative path
      },
    );
  });

  // 2. Attempt creation with missing 'detected_at' (required field)
  await TestValidator.error("missing required property: detected_at")(
    async () => {
      await api.functional.aimall_backend.administrator.abuseIncidents.create(
        connection,
        {
          body: {
            type: "system_policy",
            // detected_at intentionally omitted for negative test
          } as any, // Bypassing type check intentionally for negative path
        },
      );
    },
  );
}
