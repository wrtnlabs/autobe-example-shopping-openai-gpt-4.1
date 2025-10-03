import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller token refresh: successful refresh,
 * invalid/expired/soft-deleted account cases.
 *
 * 1. Register new seller (join)
 * 2. Attempt refresh with the valid refresh token (expect success, get new tokens)
 * 3. Attempt refresh with an invalid refresh token (expect failure)
 * 4. [Simulated] Attempt refresh with an "expired"/corrupted token (expect
 *    failure)
 * 5. [Optional] Soft-delete the account (if API supports), then attempt refresh
 *    with the formerly valid token (expect rejection)
 */
export async function test_api_seller_token_refresh_with_valid_and_invalid_token(
  connection: api.IConnection,
) {
  // 1. Register a new seller to acquire a refresh token
  // Construct realistic onboarding data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    profile_name: RandomGenerator.paragraph({ sentences: 2 }),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(sellerAuth);

  // 2. Refresh with a valid refresh token (should succeed and return new tokens)
  const validRefresh = await api.functional.auth.seller.refresh(connection, {
    body: {
      refresh_token: sellerAuth.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(validRefresh);
  // Should get a new access token and refresh token
  TestValidator.notEquals(
    "access token is rotated after refresh",
    validRefresh.token.access,
    sellerAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token is rotated after refresh",
    validRefresh.token.refresh,
    sellerAuth.token.refresh,
  );

  // 3. Attempt refresh with invalid (random/fake) refresh token (should fail)
  await TestValidator.error(
    "refresh fails with random invalid token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // 4. Attempt refresh with intentionally corrupted/expired-like token (simulated)
  // For test, use original (now rotated) refresh token (shouldn't be valid)
  await TestValidator.error(
    "refresh fails with used/old refresh token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: sellerAuth.token.refresh,
        } satisfies IShoppingMallSeller.IRefresh,
      });
    },
  );

  // 5. [OPTIONAL: Soft-delete account, if supported, to verify no refresh possible] - Not implementable unless a delete endpoint is exposed
}
