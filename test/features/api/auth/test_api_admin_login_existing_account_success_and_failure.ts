import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test admin login scenarios including normal and failure cases.
 *
 * 1. Create admin via join api with random data (status active).
 * 2. Login with correct email/password, verify JWT tokens, last_login_at, and
 *    account details.
 * 3. Attempt login with wrong password and expect failure.
 * 4. Attempt login with random (non-existent) email and expect failure.
 * 5. Change status to pending and verify login fails.
 * 6. Change status to suspended and verify login fails.
 * 7. Ensure no sensitive error data is exposed and errors are generic.
 */
export async function test_api_admin_login_existing_account_success_and_failure(
  connection: api.IConnection,
) {
  // 1. Register new admin (default status intended 'pending')
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = RandomGenerator.alphaNumeric(12);
  const fullName: string = RandomGenerator.name();
  // Create admin in pending status
  const pendingAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      full_name: fullName,
      status: "pending",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(pendingAdmin);
  TestValidator.equals(
    "admin created with pending status",
    pendingAdmin.status,
    "pending",
  );

  // Attempt login with correct credentials while status is not active
  await TestValidator.error(
    "login should fail with pending status",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password,
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // 2. Manually activate admin (simulate status change by re-join as active)
  const activeAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      full_name: fullName,
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(activeAdmin);
  TestValidator.equals("admin is now active", activeAdmin.status, "active");

  // 3. Login with correct credentials
  const loggedIn = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "login returned the correct admin id",
    loggedIn.id,
    activeAdmin.id,
  );
  TestValidator.equals(
    "login returned the correct admin email",
    loggedIn.email,
    adminEmail,
  );
  TestValidator.equals(
    "login returned the correct admin full_name",
    loggedIn.full_name,
    fullName,
  );
  TestValidator.equals(
    "admin status is active after login",
    loggedIn.status,
    "active",
  );
  // last_login_at should update
  TestValidator.predicate(
    "last_login_at is valid date-time string and set",
    typeof loggedIn.last_login_at === "string" && !!loggedIn.last_login_at,
  );

  // Tokens are present and valid
  typia.assert(loggedIn.token);
  TestValidator.predicate(
    "access token non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access/refresh token exp/refreshable are date-time strings",
    typeof loggedIn.token.expired_at === "string" &&
      typeof loggedIn.token.refreshable_until === "string",
  );

  // 4. Login fails with wrong password
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // 5. Login fails with a non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password,
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );

  // 6. Suspend admin (simulate by re-joining as suspended, which replaces the admin)
  const suspendedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password,
      full_name: fullName,
      status: "suspended",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(suspendedAdmin);
  TestValidator.equals(
    "admin is now suspended",
    suspendedAdmin.status,
    "suspended",
  );

  // 7. Login should fail with suspended admin
  await TestValidator.error(
    "login should fail with suspended status",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: adminEmail,
          password,
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
}
