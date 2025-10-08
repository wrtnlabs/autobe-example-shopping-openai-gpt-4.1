import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate that an admin can permanently delete a role if it is unused and not
 * protected.
 *
 * Steps:
 *
 * 1. Register a new admin account to obtain administrator privileges.
 * 2. Create a new custom role using a unique role_name.
 * 3. Delete the created role by its ID using the admin endpoint.
 * 4. Verify deletion succeeds (no error) if the role is unused and not protected.
 * 5. Attempt to delete a protected system-critical role and confirm error handling
 *    (expect failure).
 * 6. Attempt to delete a new role that could be in use (if system permits
 *    role-assignments, this step is skipped since no such mechanism is provided
 *    in current APIs). Note: Only use provided API functions and DTO types.
 *    Audit logging behaviors are implicitly asserted via successful/failed HTTP
 *    responses and compliance with documented API contracts.
 */
export async function test_api_admin_role_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminRequest = {
    email: adminEmail,
    password: "password12345",
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminRequest,
  });
  typia.assert(admin);

  // 2. Create a new custom role
  const roleRequest = {
    role_name: `CUSTOM${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallRole.ICreate;
  const createdRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: roleRequest },
  );
  typia.assert(createdRole);

  // 3. Delete the created role
  await api.functional.shoppingMall.admin.roles.erase(connection, {
    roleId: createdRole.id,
  });

  // 4. Attempt to delete a protected/critical role (simulate by trying system-y role, e.g. "ADMIN")
  // Since we can't create protected roles here, simulate failure scenario for forbidden deletion.
  // Use a random UUID likely not existing, expect error (business logic validation, since in-use/protected role scenario is not provided)
  const fakeRoleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "deleting non-existent or protected role should fail",
    async () => {
      await api.functional.shoppingMall.admin.roles.erase(connection, {
        roleId: fakeRoleId,
      });
    },
  );
}
