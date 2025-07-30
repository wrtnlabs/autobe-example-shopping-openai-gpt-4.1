import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate denial of administrator deletion by a user without proper
 * privileges.
 *
 * This test ensures that an attempt to hard delete an administrator account,
 * performed by an authenticated user who does not have super-admin or
 * admin-management permissions, is properly denied by the system. Such users
 * must not be able to perform this potentially destructive operation. No
 * backend mutation or deletion should occur, and a clear error response is
 * expected.
 *
 * Test steps:
 *
 * 1. Prepare a (target) administrator account to be deleted.
 * 2. Simulate a user account without super-admin or admin-management permissions.
 *    (Direct simulation, as no APIs for login/authorization are provided)
 * 3. Attempt to delete the admin account using the insufficiently privileged user.
 * 4. Confirm that an error is thrown/returned (TestValidator.error), and assert
 *    that the operation is not permitted.
 * 5. (Optional) If the system allows, confirm the target admin still exists by a
 *    re-query (not possible as no read/list API is provided). Omit this if not
 *    feasible.
 */
export async function test_api_aimall_backend_administrator_administrators_test_delete_administrator_without_permission(
  connection: api.IConnection,
) {
  // 1. Prepare a target administrator account to attempt deletion on
  const target: IAimallBackendAdministrator =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "Test Admin for Unauthorized Deletion",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(target);

  // 2. Simulate user lacking sufficient permissions (no actual login API present).
  // It is assumed that the IConnection context does not have the necessary roles.

  // 3. Attempt to delete the administrator with insufficient privilege.
  await TestValidator.error(
    "should deny admin deletion for insufficient user privilege",
  )(async () => {
    await api.functional.aimall_backend.administrator.administrators.erase(
      connection,
      {
        administratorId: target.id,
      },
    );
  });
}
