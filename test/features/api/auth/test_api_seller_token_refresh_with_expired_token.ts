import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_seller_token_refresh_with_expired_token(
  connection: api.IConnection,
) {
  /**
   * Test the /auth/seller/refresh endpoint for handling expired or invalid
   * refresh tokens.
   *
   * Validates that attempting to refresh a seller session using either an
   * expired or malformed refresh token correctly results in authentication
   * failure, ensuring secure session management. The test covers the following
   * steps:
   *
   * 1. Attempt token refresh with an obviously malformed refresh token string.
   * 2. Attempt token refresh with a syntactically valid but clearly expired token
   *    string.
   * 3. In both cases, confirm that the server refuses the request by throwing an
   *    error (unauthorized/invalid session), using TestValidator.error.
   *
   * Prerequisites: There are no data preparation steps required, as both tokens
   * are intentionally unauthenticated/invalid.
   */

  // 1. Attempt refresh with a clearly malformed refresh token
  await TestValidator.error("refresh fails with malformed token", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "invalid_token_not_jwt",
      } satisfies IShoppingMallAiBackendSeller.IRefresh,
    });
  });

  // 2. Attempt refresh with an expired-like (but syntactically valid) JWT
  // (Here we use a properly formed JWT pattern, but it's not an actual valid token, and definitely not issued by the server)
  const expiredLikeToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.signature";
  await TestValidator.error(
    "refresh fails with expired or unrecognized valid-looking token",
    async () => {
      await api.functional.auth.seller.refresh(connection, {
        body: {
          refresh_token: expiredLikeToken,
        } satisfies IShoppingMallAiBackendSeller.IRefresh,
      });
    },
  );
}
