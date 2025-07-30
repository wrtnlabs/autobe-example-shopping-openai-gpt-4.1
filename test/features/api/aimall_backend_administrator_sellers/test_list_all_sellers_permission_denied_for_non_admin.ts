import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Validate that non-administrators (such as regular customers, sellers, or
 * unauthenticated users) cannot access the GET
 * /aimall-backend/administrator/sellers endpoint.
 *
 * This test is essential to ensure that strict access control is enforced on
 * sensitive platform endpoints. Only users with administrator privileges should
 * be able to fetch the list of all sellers. If access is attempted by users
 * without the proper role, the API must respond with a permissions error
 * (typically 403 Forbidden) and must not return any seller records.
 *
 * Step-by-step process:
 *
 * 1. Attempt to call the GET /aimall-backend/administrator/sellers endpoint using
 *    a connection that simulates a non-administrator user (for example, a
 *    customer or seller account, or an unauthenticated session).
 * 2. Expect the API call to fail with an authorization or permission error (such
 *    as 403 Forbidden), confirming that access is denied to unauthorized
 *    users.
 * 3. Confirm that no seller data is disclosed or returned in the response.
 *
 * By simulating requests from both unauthenticated and non-admin authenticated
 * roles, this test helps prevent unauthorized information disclosure and
 * enforces the security of the admin-only endpoint.
 */
export async function test_api_aimall_backend_administrator_sellers_test_list_all_sellers_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // Attempt API access as a non-admin (such as a customer, seller, or unauthenticated)
  // The actual implementation of role simulation depends on available authentication APIs. If not available, focus on 'unauthenticated' scenario.

  // 1. Attempt GET request without admin privileges and expect an error
  await TestValidator.error("should reject non-admin access")(async () => {
    await api.functional.aimall_backend.administrator.sellers.index(connection);
  });
}
