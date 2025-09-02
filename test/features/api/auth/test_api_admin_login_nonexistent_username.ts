import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_login_nonexistent_username(
  connection: api.IConnection,
) {
  /**
   * Test error handling when admin login is attempted with a non-existent
   * username.
   *
   * - Generates a random username not present in the admin table and an arbitrary
   *   password
   * - Sends these credentials to the admin login endpoint
   * - Expects the backend to reject the login attempt (authentication failure)
   * - Asserts that an error is thrown (failure to authenticate as admin)
   *
   * This test ensures the backend securely enforces authentication rules and
   * does not allow login for unknown admin users.
   */
  await TestValidator.error(
    "login fails for non-existent admin username",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          username: RandomGenerator.alphaNumeric(16),
          password: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallAiBackendAdmin.ILogin,
      });
    },
  );
}
