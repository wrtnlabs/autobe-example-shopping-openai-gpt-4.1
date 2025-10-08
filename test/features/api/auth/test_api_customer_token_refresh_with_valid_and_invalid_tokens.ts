import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test the customer JWT token refreshing process using both valid and invalid
 * refresh tokens. This test covers both successful token rotation as well as
 * expected failures for invalid, revoked, or malformed refresh tokens.
 *
 * Steps:
 *
 * 1. Register a new customer
 * 2. Login as the new customer to obtain a refresh token
 * 3. Successfully refresh tokens using the valid refresh token
 * 4. Attempt to refresh using an obviously malformed/random string token (expect
 *    error)
 * 5. Attempt to refresh using an already used/invalidated token (simulate by
 *    issuing a second refresh, making the first token invalid if backend
 *    invalidates upon use)
 * 6. Optionally: Simulate refresh with an expired token if possible (cannot
 *    simulate in pure E2E without backend support)
 * 7. Validate strict satisfaction of output types and use TestValidator.error for
 *    all error cases.
 */
export async function test_api_customer_token_refresh_with_valid_and_invalid_tokens(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IShoppingMallCustomer.ILogin;

  // 2. Login to get access/refresh tokens
  const loginResult = await api.functional.auth.customer.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  const refreshToken = loginResult.token.refresh;

  // 3. Successful refresh
  const refreshResult = await api.functional.auth.customer.refresh(connection, {
    body: {
      refresh_token: refreshToken,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);
  TestValidator.notEquals(
    "refresh should rotate refresh token (new token differs)",
    refreshResult.token.refresh,
    refreshToken,
  );
  TestValidator.notEquals(
    "refresh should rotate access token (new token differs)",
    refreshResult.token.access,
    loginResult.token.access,
  );

  // 4. Error: obviously malformed token
  await TestValidator.error("malformed refresh token is rejected", async () => {
    await api.functional.auth.customer.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(40),
      } satisfies IShoppingMallCustomer.IRefresh,
    });
  });

  // 5. Error: old/invalidated token (simulate by using previous refreshToken after it was used/rotated)
  await TestValidator.error(
    "reusing old refresh token should fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: refreshToken,
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );

  // 6. (Optional) Simulate expired token (not possible here unless the backend allows manipulating expiry)
}
