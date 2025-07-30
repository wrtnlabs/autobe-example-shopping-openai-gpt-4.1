import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling for deleting a non-existent or already-deleted abuse
 * incident.
 *
 * This test verifies that attempting to hard-delete an abuse incident using a
 * UUID that does not exist (or was already deleted) results in a 404 Not Found
 * error (or another suitable error), and that no other records are erroneously
 * affected.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is extremely unlikely to correspond to a real
 *    (existing) abuse incident (ensuring a non-existent incident ID).
 * 2. Attempt to delete (hard-delete) the abuse incident by calling the erase API
 *    with this random UUID.
 * 3. Confirm that the API call throws an error (preferably HttpError) with 404 Not
 *    Found or an appropriate similar status code, indicating the target does
 *    not exist.
 * 4. Confirm error is thrown as expected and, if possible, validate that no other
 *    records are deleted (scope limited unless more APIs are present).
 *
 * This ensures API robustness and proper error handling for invalid deletion
 * attempts.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_delete_abuse_incident_nonexistent_id(
  connection: api.IConnection,
) {
  const nonExistentAbuseIncidentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Attempt to delete with a non-existent/invalid id and expect error
  await TestValidator.error(
    "deleting non-existent abuse incident should return error",
  )(async () => {
    await api.functional.aimall_backend.administrator.abuseIncidents.erase(
      connection,
      { abuseIncidentId: nonExistentAbuseIncidentId },
    );
  });
}
