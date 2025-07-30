import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate hard deletion of an abuse incident by an administrator role.
 *
 * This E2E test verifies that an administrator can perform a hard delete of a
 * specific abuse incident. After deletion, the test attempts to access the
 * deleted record to ensure it is no longer retrievable and is fully removed
 * from the system. Because there is no incident detail or list API exposed in
 * the available SDK, the test cannot directly validate nonexistence, but it
 * documents this expectation. Audit log validation is noted as out-of-scope.
 *
 * Process steps:
 *
 * 1. Create a new abuse incident for deletion.
 * 2. Delete the incident by its id as an admin (hard delete).
 * 3. (Logical) Attempt to fetch the deleted incident and expect not found
 *    (skipped, due to lack of API).
 */
export async function test_api_aimall_backend_abuseIncidents_test_delete_abuse_incident_with_admin_role(
  connection: api.IConnection,
) {
  // 1. Create a new abuse incident
  const createBody = {
    type: "system_policy",
    details: "Test incident for admin-delete E2E scenario.",
    detected_at: new Date().toISOString(),
  } satisfies IAimallBackendAbuseIncident.ICreate;

  const incident =
    await api.functional.aimall_backend.administrator.abuseIncidents.create(
      connection,
      { body: createBody },
    );
  typia.assert(incident);

  // 2. Hard delete the newly created abuse incident
  await api.functional.aimall_backend.administrator.abuseIncidents.erase(
    connection,
    { abuseIncidentId: incident.id },
  );

  // 3. (Out-of-scope) Attempt to fetch the deleted incident
  // There is no incident detail or listing fetch API provided, so the actual verification of nonexistence cannot be implemented here.
  // This logical check is documented for completeness per scenario requirements.
}
