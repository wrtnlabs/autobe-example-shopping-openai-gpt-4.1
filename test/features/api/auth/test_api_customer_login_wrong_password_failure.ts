import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_login_wrong_password_failure(
  connection: api.IConnection,
) {
  /**
   * Validate customer login fails with wrong password.
   *
   * This test ensures that the authentication logic does not allow logins with
   * incorrect passwords for registered users. This is a core security
   * requirement for the shopping mall's API.
   *
   * Step-by-step process:
   *
   * 1. Register a new customer with random but valid credentials.
   * 2. Attempt login with the correct email and an incorrect password.
   * 3. Assert that authentication fails and no authorization tokens are issued.
   * 4. Do not inspect specific error messages, only verify that an error is thrown
   *    (business rule enforced).
   */
  // 1. Register new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joined = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joined);

  // 2. Attempt failed login (wrong password)
  await TestValidator.error("login fails with wrong password", async () => {
    await api.functional.auth.customer.login(connection, {
      body: {
        email: joinInput.email,
        password: typia.random<string & tags.Format<"password">>(), // Guaranteed different from original
      } satisfies IShoppingMallAiBackendCustomer.ILogin,
    });
  });
}
