import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate comprehensive admin login business logic and access audit flows.
 *
 * 1. Register new admin via /auth/admin/join with random email/password and name
 * 2. Success login: use correct credentials for /auth/admin/login and check
 *    access/refresh token pattern
 * 3. Failure login: use same email but invalid password and expect login failure
 *    (business error)
 * 4. Soft-delete test: simulate soft-deletion by changing status and deleted_at
 *    (in memory) and attempt login again to confirm denial
 * 5. All error scenarios are business logic only (no type error testing)
 */
export async function test_api_admin_login_and_session_audit(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const joinBody = { email, password, name } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, email);
  TestValidator.equals("admin name matches input", admin.name, name);
  TestValidator.equals(
    "admin status is active after join",
    admin.status,
    "active",
  );
  TestValidator.equals("deleted_at is null after join", admin.deleted_at, null);

  // 2. Successful login
  const loginBody = { email, password } satisfies IShoppingMallAdmin.ILogin;
  const loginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: loginBody,
    });
  typia.assert(loginResult);
  TestValidator.equals("login ID matches join", loginResult.id, admin.id);
  TestValidator.equals(
    "login email matches join",
    loginResult.email,
    admin.email,
  );
  // Ensure token present and contains both access and refresh
  TestValidator.predicate(
    "access token is string",
    typeof loginResult.token.access === "string",
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof loginResult.token.refresh === "string",
  );
  TestValidator.predicate(
    "access token not empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    loginResult.token.refresh.length > 0,
  );

  // 3. Failed login with wrong password
  await TestValidator.error("login fails with invalid password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(15),
      } satisfies IShoppingMallAdmin.ILogin,
    });
  });

  // 4. Failed login for soft-deleted admin
  // Simulate by crafting a deleted session (cannot change via API, so test logic checks only join/deleted_at business logic)
  // Since API does not allow us to soft-delete admins directly, skip this step as it's not implementable
}
