import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_login_invalid_password(
  connection: api.IConnection,
) {
  /**
   * This test ensures that the admin login endpoint rejects authentication when
   * an incorrect password is supplied, even if the username exists.
   *
   * Steps:
   *
   * 1. Register a new admin with a known password hash.
   * 2. Attempt login with the correct username but a bad password.
   * 3. Validate that authentication fails (error is thrown).
   */

  // 1. Register a new admin with a known password and hash.
  const username = RandomGenerator.alphaNumeric(10);
  const password = RandomGenerator.alphaNumeric(16);
  // Simulate password hashing (for testing, using a simple reversible scheme)
  const password_hash = password.split("").reverse().join("");
  const registration = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash,
      name: RandomGenerator.name(),
      email: `${username}@example.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(registration);

  // 2. Attempt login with the correct username but an invalid password.
  const invalidLogin = {
    username,
    password: RandomGenerator.alphaNumeric(20),
  } satisfies IShoppingMallAiBackendAdmin.ILogin;

  // 3. Expect error during login attempt.
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.admin.login(connection, {
      body: invalidLogin,
    });
  });
}
