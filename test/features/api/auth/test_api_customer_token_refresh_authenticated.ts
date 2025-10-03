import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";

/**
 * Validate JWT refresh for authenticated customers.
 *
 * This test ensures customers can refresh their JWT access and refresh tokens
 * when authenticated and their account is in an active state. The workflow
 * covers successful refresh, unchanged identity across refresh, and rejection
 * of refresh with invalid/expired tokens (but does not test type errors or
 * field omissions).
 *
 * Steps:
 *
 * 1. Register a new customer account for a randomly generated channel ID with
 *    required data.
 * 2. Log in as this customer and retrieve the refresh token.
 * 3. Call refresh endpoint with the valid refresh token and assert new tokens are
 *    issued.
 * 4. Verify identity (id, channel, email, name, phone) remains unchanged.
 * 5. Negative: Attempt refresh with an obviously invalid token, expect failure.
 */
export async function test_api_customer_token_refresh_authenticated(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10); // 10-char password
  const name = RandomGenerator.name();
  const phone = RandomGenerator.mobile();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email,
    password,
    name,
    phone,
  } satisfies IShoppingMallCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinResult);

  // 2. Log in as this customer to get valid token set
  const loginResult = await api.functional.auth.customer.login(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email,
      password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);

  // 3. Refresh token with valid refresh token
  const refreshResult = await api.functional.auth.customer.refresh(connection, {
    body: {
      refresh_token: loginResult.token.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshResult);

  // 4. Identity properties remain unchanged
  TestValidator.equals(
    "refresh id unchanged",
    refreshResult.id,
    loginResult.id,
  );
  TestValidator.equals(
    "refresh channel unchanged",
    refreshResult.shopping_mall_channel_id,
    loginResult.shopping_mall_channel_id,
  );
  TestValidator.equals(
    "refresh email unchanged",
    refreshResult.email,
    loginResult.email,
  );
  TestValidator.equals(
    "refresh name unchanged",
    refreshResult.name,
    loginResult.name,
  );
  TestValidator.equals(
    "refresh phone unchanged",
    refreshResult.phone,
    loginResult.phone,
  );

  // 5. Negative: refresh with obviously invalid token
  await TestValidator.error(
    "should reject refresh with invalid token",
    async () => {
      await api.functional.auth.customer.refresh(connection, {
        body: {
          refresh_token: "invalid.refresh.token.value",
        } satisfies IShoppingMallCustomer.IRefresh,
      });
    },
  );
}
