import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPermission";

/**
 * Validate access controls for fetching the AIMall backend permission/role list
 * by non-administrator accounts.
 *
 * This test simulates a scenario where a non-admin user (e.g., customer or
 * seller) attempts to fetch the list of RBAC permissions via the admin
 * permissions endpoint. The expected outcome is denial of access or an
 * appropriate permission error, verifying that role-based access controls
 * (RBAC) are enforced and that only users with administrative rights can query
 * the permissions list.
 *
 * This protects sensitive system metadata and ensures RBAC requirements are
 * enforced on assignment, audit, and policy endpoints.
 *
 * Steps:
 *
 * 1. Attempt to call the permissions endpoint without administrator privilege
 *    using a default connection (not authenticated or authenticated as
 *    non-admin if possible).
 * 2. Confirm that access is denied by verifying an error is thrown or result is
 *    missing/invalid.
 * 3. Use TestValidator.error to assert that an error occurs in this case,
 *    confirming backend enforcement of RBAC protections.
 */
export async function test_api_aimall_backend_test_get_all_permissions_without_admin_permissions(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch the permissions list as a non-admin (no admin login/authentication provided)
  // 2. Expect that this call will throw an error or return denied access.
  await TestValidator.error("should deny access for non-admin account")(
    async () => {
      await api.functional.aimall_backend.administrator.permissions.index(
        connection,
      );
    },
  );
}
