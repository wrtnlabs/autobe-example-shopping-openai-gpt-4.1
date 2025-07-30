import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate 404 error when accessing nonexistent abuse incident record (robust
 * error protection).
 *
 * Ensures the abuse incident detail GET endpoint correctly returns a 404 Not
 * Found error when queried with an abuseIncidentId that does not exist in the
 * system, and does not leak any sensitive data.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is exceedingly unlikely to exist in the system
 *    (simulating a deleted or never-created abuse incident).
 * 2. Attempt a GET request to the abuse incident detail endpoint using this fake
 *    ID.
 * 3. Confirm the API throws an error (expected 404 Not Found), and ensure no
 *    sensitive or implementation-specific details are leaked by the error.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_abuse_incident_detail_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a random (nonexistent) abuseIncidentId
  const nonexistentAbuseIncidentId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt the GET request and expect a 404 error (error type only, not content)
  await TestValidator.error("should throw 404 for nonexistent abuse incident")(
    async () => {
      await api.functional.aimall_backend.administrator.abuseIncidents.at(
        connection,
        {
          abuseIncidentId: nonexistentAbuseIncidentId,
        },
      );
    },
  );
}
