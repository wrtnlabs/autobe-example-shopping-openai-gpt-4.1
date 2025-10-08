import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validates admin-only access control for the role detail endpoint.
 *
 * This test verifies that:
 *
 * 1. An authenticated admin can retrieve the details of a real role by its roleId.
 * 2. Unauthenticated requests to the role detail endpoint are denied.
 * 3. A request for a nonexistent roleId by an admin returns an error.
 *
 * Steps:
 *
 * 1. Register a new admin via api.functional.auth.admin.join() to obtain
 *    credentials and authorization.
 * 2. Create a new system role via
 *    api.functional.shoppingMall.admin.roles.create(); record its id for detail
 *    testing.
 * 3. Successfully fetch that role's detail using
 *    api.functional.shoppingMall.admin.roles.at(); assert the returned type and
 *    business properties.
 * 4. Attempt to fetch the detail with a random (nonexistent) UUID as roleId;
 *    expect a business error (e.g. not found).
 * 5. Attempt to fetch the real roleId detail using an unauthenticated connection;
 *    expect rejection due to missing admin credentials.
 */
export async function test_api_admin_role_detail_access_control(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "testpassword123",
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Step 2: Create a new role
  const createRoleBody = {
    role_name: RandomGenerator.paragraph({ sentences: 1 }).toUpperCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallRole.ICreate;
  const newRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: createRoleBody },
  );
  typia.assert(newRole);
  // Step 3: Authenticated admin fetches real role detail
  const roleDetail = await api.functional.shoppingMall.admin.roles.at(
    connection,
    { roleId: newRole.id },
  );
  typia.assert(roleDetail);
  TestValidator.equals("fetched role id matches", roleDetail.id, newRole.id);
  TestValidator.equals(
    "fetched role_name matches",
    roleDetail.role_name,
    createRoleBody.role_name,
  );
  TestValidator.equals(
    "fetched description matches",
    roleDetail.description,
    createRoleBody.description,
  );
  // Step 4: Fetching nonexistent roleId yields error
  await TestValidator.error("error on nonexistent role id", async () => {
    await api.functional.shoppingMall.admin.roles.at(connection, {
      roleId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
  // Step 5: Unauthenticated fetch (empty headers; no token) is forbidden
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated access denied", async () => {
    await api.functional.shoppingMall.admin.roles.at(unauthConn, {
      roleId: newRole.id,
    });
  });
}
