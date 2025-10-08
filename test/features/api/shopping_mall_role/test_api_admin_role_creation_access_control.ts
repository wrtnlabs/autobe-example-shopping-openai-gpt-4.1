import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Test admin role creation access control in shopping mall system.
 *
 * Ensures that:
 *
 * 1. Only authenticated admins can create new roles (RBAC entry).
 * 2. Role creation works with valid input and a fresh, unique role_name
 *    (uppercase) and description.
 * 3. Unauthenticated (no admin session) requests to create roles are denied.
 * 4. Response metadata for created role conforms to model.
 */
export async function test_api_admin_role_creation_access_control(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCredentials,
    });
  typia.assert(authorizedAdmin);

  // 2. Authenticated admin creates a new role
  const testRoleName = RandomGenerator.alphabets(10).toUpperCase();
  const createRoleRequest = {
    role_name: testRoleName,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallRole.ICreate;

  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: createRoleRequest,
    });
  typia.assert(createdRole);
  TestValidator.equals(
    "created role_name matches",
    createdRole.role_name,
    testRoleName,
  );
  TestValidator.equals(
    "created description matches",
    createdRole.description,
    createRoleRequest.description,
  );

  // Ensure returned metadata is properly set
  TestValidator.predicate(
    "created role id is uuid",
    typeof createdRole.id === "string" &&
      /^[0-9a-f-]{36}$/.test(createdRole.id),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof createdRole.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof createdRole.updated_at === "string",
  );

  // 3. Unauthenticated: create a new connection and attempt role creation (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const unauthedRoleReq = {
    role_name: RandomGenerator.alphabets(8).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallRole.ICreate;
  await TestValidator.error("deny unauthenticated role creation", async () => {
    await api.functional.shoppingMall.admin.roles.create(unauthConn, {
      body: unauthedRoleReq,
    });
  });
}
