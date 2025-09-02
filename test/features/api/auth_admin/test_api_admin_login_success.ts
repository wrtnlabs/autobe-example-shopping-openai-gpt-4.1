import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_login_success(
  connection: api.IConnection,
) {
  /**
   * Test successful admin login with valid credentials.
   *
   * 1. Register a new admin account using /auth/admin/join to obtain valid
   *    credentials.
   * 2. Attempt login via /auth/admin/login using exactly the same username and
   *    password.
   * 3. Assert that response includes a token pair and the admin profile.
   * 4. Assert that the login response's admin data matches the registration data
   *    (username, email, name, etc).
   * 5. Validate all outputs with typia.assert.
   * 6. Ensure end-to-end authentication flow with strict credential and token
   *    checking.
   */

  // Generate unique, valid registration info
  const username = RandomGenerator.alphaNumeric(10);
  const rawPassword = RandomGenerator.alphaNumeric(14);
  const password_hash = rawPassword; // In E2E/mock, treat password as-is
  const name = RandomGenerator.name();
  const email = `${RandomGenerator.alphaNumeric(8)}@test-aiexample.com`;
  const phone_number = RandomGenerator.mobile();
  const is_active = true;

  // 1. Register admin
  const registration = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash,
      name,
      email,
      phone_number,
      is_active,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(registration);

  // 2. Attempt login with registered username/password
  const login = await api.functional.auth.admin.login(connection, {
    body: {
      username,
      password: rawPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });
  typia.assert(login);

  // 3. Assert that login admin details match registration (except for tokens and timestamps)
  const regAdmin = registration.admin;
  const loginAdmin = login.admin;
  TestValidator.equals("admin id matches", loginAdmin.id, regAdmin.id);
  TestValidator.equals(
    "admin username matches",
    loginAdmin.username,
    regAdmin.username,
  );
  TestValidator.equals("admin email matches", loginAdmin.email, regAdmin.email);
  TestValidator.equals("admin name matches", loginAdmin.name, regAdmin.name);
  TestValidator.equals(
    "admin phone number matches",
    loginAdmin.phone_number,
    regAdmin.phone_number,
  );
  TestValidator.equals(
    "is_active matches",
    loginAdmin.is_active,
    regAdmin.is_active,
  );

  // 4. Assert token structure
  typia.assert(login.token);
  TestValidator.predicate(
    "access token is not empty",
    typeof login.token.access === "string" && login.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    typeof login.token.refresh === "string" && login.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is iso string",
    typeof login.token.expired_at === "string" &&
      login.token.expired_at.includes("T"),
  );
  TestValidator.predicate(
    "refreshable_until is iso string",
    typeof login.token.refreshable_until === "string" &&
      login.token.refreshable_until.includes("T"),
  );
}
