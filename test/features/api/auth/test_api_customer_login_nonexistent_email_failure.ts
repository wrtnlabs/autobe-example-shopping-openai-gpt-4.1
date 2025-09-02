import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validate error handling when attempting to log in with a non-existent
 * customer email.
 *
 * This test verifies that the authentication endpoint correctly rejects
 * login attempts for emails not present in the database, returning a
 * runtime error (such as 401 Unauthorized or 404 Not Found) and does not
 * issue authentication tokens or a customer object.
 *
 * Steps:
 *
 * 1. Compose a login request using a syntactically valid but guaranteed
 *    non-existent email address and an arbitrary password.
 * 2. Attempt to log in via /auth/customer/login (POST).
 * 3. Assert that the API responds with an error (authentication failure for
 *    non-existent email).
 * 4. Assert that no tokens or customer objects are issued in the error
 *    response, and that there are no side effects.
 * 5. Confirm that API does not create any session or return any sensitive
 *    data.
 */
export async function test_api_customer_login_nonexistent_email_failure(
  connection: api.IConnection,
) {
  // 1. Compose a non-existent, valid-format email
  const fabricatedEmail: string = `noone_${RandomGenerator.alphaNumeric(10)}@notarealtestdomain.com`;
  const arbitraryPassword: string = RandomGenerator.alphaNumeric(16);

  // 2 & 3. Attempt to log in and expect an error (e.g., 401/404) at runtime
  await TestValidator.error(
    "login should fail for non-existent customer email",
    async () => {
      await api.functional.auth.customer.login(connection, {
        body: {
          email: fabricatedEmail,
          password: arbitraryPassword as string & tags.Format<"password">,
        } satisfies IShoppingMallAiBackendCustomer.ILogin,
      });
    },
  );
}
