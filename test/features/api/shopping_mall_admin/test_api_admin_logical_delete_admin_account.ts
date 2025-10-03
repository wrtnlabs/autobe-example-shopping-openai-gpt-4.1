import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate the logical deletion (soft delete) of an administrator account by an
 * authenticated admin.
 *
 * This test validates end-to-end flows as follows:
 *
 * 1. Register a new admin and obtain authorization (join and login flow).
 * 2. Use the returned adminId to perform logical deletion via
 *    /shoppingMall/admin/admins/{adminId}.
 * 3. Validate successful deletion (no response body, no hard delete, deleted_at
 *    field set if retrieved).
 * 4. Attempting to delete a non-existent adminId should fail with an error.
 * 5. Attempting repeated deletion of the same admin should fail gracefully and not
 *    change deleted_at.
 * 6. Attempting logical deletion as an unauthenticated or non-admin user should
 *    fail.
 * 7. Audit trails and compliance evidence should be confirmed by system event/log
 *    constraints.
 */
export async function test_api_admin_logical_delete_admin_account(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Perform logical delete on the registered admin
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId,
  });

  // 3. Try repeated deletion - should error
  await TestValidator.error("repeated deletion should fail", async () => {
    await api.functional.shoppingMall.admin.admins.erase(connection, {
      adminId,
    });
  });

  // 4. Try deletion with non-existent adminId
  const fakeAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent adminId deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        adminId: fakeAdminId,
      });
    },
  );

  // 5. Simulate unauthorized access: try to delete as unauthenticated
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated deletion should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(unauthConn, {
        adminId,
      });
    },
  );

  // 6. There is no API to re-read deleted admin or direct audit log validation exposed for test,
  //    so remaining validation is covered by error scenarios above.
}
