import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_refresh_token_expired_failure(
  connection: api.IConnection,
) {
  /**
   * E2E test: Rejection of refresh with expired or invalid refresh token.
   *
   * This test validates that the API refuses to issue new access tokens when
   * the customer supplies an expired, obviously invalid, or tampered refresh
   * token.
   *
   * Steps:
   *
   * 1. Register and log in a new customer to obtain valid tokens.
   * 2. Attempt refresh with a totally invalid string
   *    ("expired_refresh_token_1234"). Expect error.
   * 3. Attempt refresh with a slightly tampered/corrupted version of the valid
   *    token. Expect error.
   * 4. Attempt refresh with a random alphanumeric string of correct length. Expect
   *    error unless it duplicates the real valid token.
   * 5. In all cases, validate that no new tokens are issued upon failure.
   */

  // 1. Register and log in a new customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);
  const validRefreshToken: string = auth.token.refresh;

  // 2. Attempt to refresh with a totally invalid token string
  await TestValidator.error(
    "refresh with totally invalid token should fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: "expired_refresh_token_1234",
        } satisfies IShoppingMallAiBackendCustomer.IRefresh,
      });
    },
  );

  // 3. Attempt to refresh with a slightly corrupted/tampered (but similar) refresh token
  const corruptedRefreshToken = validRefreshToken.slice(0, -3) + "xyz";
  await TestValidator.error(
    "refresh with corrupted token should fail",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: corruptedRefreshToken,
        } satisfies IShoppingMallAiBackendCustomer.IRefresh,
      });
    },
  );

  // 4. Attempt to refresh using a random string of correct length (unless it happens to duplicate valid token)
  const randomFakeToken = RandomGenerator.alphaNumeric(
    validRefreshToken.length,
  );
  if (randomFakeToken !== validRefreshToken) {
    await TestValidator.error(
      "refresh with random fake token should fail",
      async () => {
        await api.functional.auth.customer.refresh(connection, {
          body: {
            refresh_token: randomFakeToken,
          } satisfies IShoppingMallAiBackendCustomer.IRefresh,
        });
      },
    );
  }
}
