import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Test login failure for seller with correct email but incorrect password.
 *
 * 1. Register a new seller with random valid credentials.
 * 2. Attempt to log in using that seller's email but use an incorrect
 *    password.
 * 3. Verify that login fails (API throws error) and that no authorization
 *    token or profile is issued.
 *
 * Steps:
 *
 * - Use /auth/seller/join to register.
 * - Use /auth/seller/login with right email + wrong password and expect
 *   rejection.
 * - Use TestValidator.error with await to confirm error on login attempt.
 *
 * Edge: Check that actual password and wrong password are always different.
 */
export async function test_api_seller_login_invalid_password(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const email = typia.random<string & tags.Format<"email">>();
  const businessRegistrationNumber = RandomGenerator.alphaNumeric(10);
  const name = RandomGenerator.name();

  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email,
      business_registration_number: businessRegistrationNumber,
      name,
    } satisfies IShoppingMallAiBackendSeller.ICreate,
  });
  typia.assert(sellerJoin);

  // 2. Attempt to log in with the correct email and an incorrect password
  const wrongPassword = "invalidPW" + RandomGenerator.alphaNumeric(6);
  await TestValidator.error(
    "seller login fails with valid email but incorrect password",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email,
          password: wrongPassword,
        } satisfies IShoppingMallAiBackendSeller.ILogin,
      });
    },
  );
}
