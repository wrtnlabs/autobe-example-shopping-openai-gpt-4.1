import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test permanent deletion of a system admin account by a super-admin.
 *
 * Verifies that a super-admin can register and delete another admin, that
 * deletion is permanent, and that attempts to delete a non-existent admin
 * result in error.
 *
 * Steps:
 *
 * 1. Register a new admin account (to be deleted) using random credentials.
 * 2. As super-admin, delete that admin account by ID.
 * 3. Attempt to delete a non-existent admin by using a random UUID; expect error.
 */
export async function test_api_admin_account_permanent_deletion_by_super_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (to be deleted)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();

  const createdAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(createdAdmin);
  const adminId = createdAdmin.id;

  // 2. Delete the newly created admin as super-admin
  await api.functional.shoppingMall.admin.admins.erase(connection, {
    adminId,
  });

  // 3. Attempt to delete a non-existent admin (random UUID)
  await TestValidator.error(
    "deleting non-existent admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.erase(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
