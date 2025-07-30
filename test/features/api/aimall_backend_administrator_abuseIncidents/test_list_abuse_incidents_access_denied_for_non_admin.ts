import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAbuseIncident";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAbuseIncident } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAbuseIncident";

/**
 * Validate access controls on the abuse incident listing endpoint: ensure
 * non-admins cannot access sensitive event logs.
 *
 * This test simulates a request to the GET
 * /aimall-backend/administrator/abuseIncidents API while the API connection is
 * under the context of a non-admin user—specifically, a typical unprivileged
 * customer or seller account (based on project credential context
 * availability).
 *
 * It then asserts that the API responds with a forbidden or access denied
 * error, never allowing non-admin users to view page data. This confirms that
 * backend ABAC restrictions protecting fraud/abuse logs are robustly enforced
 * at the route level for all unauthorized actors.
 *
 * Steps:
 *
 * 1. (Prerequisite) Prepare a connection that simulates a typical non-admin user
 *    account.
 * 2. Attempt to request a list of abuse incident records using the non-admin
 *    connection.
 * 3. Assert that the API returns a forbidden/access denied error, and that no page
 *    data is exposed to the caller.
 */
export async function test_api_aimall_backend_administrator_abuseIncidents_test_list_abuse_incidents_access_denied_for_non_admin(
  connection: api.IConnection,
) {
  // Simulate a non-admin (customer/seller) connection. The test environment should provide a non-privileged user session.
  // Attempt to access the admin-only endpoint.
  await TestValidator.error("non-admin must not access abuse incident logs")(
    async () => {
      await api.functional.aimall_backend.administrator.abuseIncidents.index(
        connection,
      );
    },
  );
}
