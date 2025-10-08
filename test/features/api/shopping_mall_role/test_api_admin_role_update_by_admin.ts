import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate updating of a platform role by admin user, including uniqueness,
 * business logic, and access control edge cases.
 *
 * 1. Register a new admin account for authentication (to set headers).
 * 2. Create an initial platform role (role A) with unique role_name/description.
 * 3. Update the role's description (valid update, no role_name change).
 *
 *    - Verify description is updated, role_name is unchanged, timestamps adjusted.
 * 4. Update the role's role_name to a new unique value.
 *
 *    - Verify both role_name and audit (updated_at) field are changed.
 * 5. Create a second distinct role (role B).
 * 6. Attempt to update role A's role_name to the exact same value as role B's
 *    role_name.
 *
 *    - Should trigger transactional/uniqueness error.
 * 7. Attempt to update role as a non-admin (simulate by clearing headers/using new
 *    connection if possible).
 *
 *    - Should be denied with access error (if test infra allows it).
 * 8. Optional: Check audit trail by verifying updated_at != created_at after
 *    changes.
 */
export async function test_api_admin_role_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create an initial role (Role A)
  const roleAData = {
    role_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 8,
    }).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRole.ICreate;
  const roleA = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: roleAData,
    },
  );
  typia.assert(roleA);
  TestValidator.equals(
    "roleA role_name matches",
    roleA.role_name,
    roleAData.role_name,
  );
  TestValidator.equals(
    "roleA description matches",
    roleA.description,
    roleAData.description,
  );

  // 3. Update description of Role A (valid update)
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateDescRoleA = await api.functional.shoppingMall.admin.roles.update(
    connection,
    {
      roleId: roleA.id,
      body: { description: newDescription } satisfies IShoppingMallRole.IUpdate,
    },
  );
  typia.assert(updateDescRoleA);
  TestValidator.equals(
    "roleA description updated",
    updateDescRoleA.description,
    newDescription,
  );
  TestValidator.equals(
    "roleA role_name unchanged",
    updateDescRoleA.role_name,
    roleAData.role_name,
  );
  TestValidator.notEquals(
    "roleA updated_at changed after update",
    updateDescRoleA.updated_at,
    updateDescRoleA.created_at,
  );

  // 4. Update role_name of Role A to a new value (valid unique)
  const newRoleNameA = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 8,
  }).toUpperCase();
  const updateRoleNameA = await api.functional.shoppingMall.admin.roles.update(
    connection,
    {
      roleId: roleA.id,
      body: { role_name: newRoleNameA } satisfies IShoppingMallRole.IUpdate,
    },
  );
  typia.assert(updateRoleNameA);
  TestValidator.equals(
    "roleA new role_name",
    updateRoleNameA.role_name,
    newRoleNameA,
  );
  TestValidator.notEquals(
    "roleA role_name changed",
    updateRoleNameA.role_name,
    roleAData.role_name,
  );

  // 5. Create a second distinct role (Role B)
  const roleBData = {
    role_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 8,
    }).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallRole.ICreate;
  const roleB = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: roleBData,
    },
  );
  typia.assert(roleB);

  // 6. Attempt to update Role A's role_name to conflict with Role B's role_name
  await TestValidator.error(
    "update role_name to duplicate triggers uniqueness error",
    async () => {
      await api.functional.shoppingMall.admin.roles.update(connection, {
        roleId: roleA.id,
        body: {
          role_name: roleB.role_name,
        } satisfies IShoppingMallRole.IUpdate,
      });
    },
  );

  // 7. Attempt update as unauthenticated/non-admin
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user denied access to update",
    async () => {
      await api.functional.shoppingMall.admin.roles.update(unauthConnection, {
        roleId: roleA.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallRole.IUpdate,
      });
    },
  );
}
