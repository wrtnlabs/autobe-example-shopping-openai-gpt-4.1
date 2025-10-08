import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate the seller token refresh lifecycle.
 *
 * This E2E test function covers the full authentication and session flow for
 * sellers, including business error conditions:
 *
 * 1. Register a seller using realistic legal/business details.
 * 2. Attempt login prior to email verification/approval: verify that refresh
 *    endpoint fails, confirming 'pending' cannot refresh tokens.
 * 3. Manually set seller approval_status to 'approved' and email_verified to true
 *    (simulate admin action via direct DB patch or a mock/hook if testing infra
 *    allows; skip actual DB call if forbidden).
 * 4. Login with the seller and confirm valid JWT and refresh tokens are received.
 * 5. Immediately use valid refresh token.
 *
 *    - Call /auth/seller/refresh and expect new tokens.
 *    - Both the access and refresh tokens should differ from the original tokens
 *         (rotation check).
 *    - Typia.assert() on responses for type safety.
 *    - TestValidator.notEquals for access and refresh tokens.
 * 6. Attempt refresh with old refresh token (should now be revoked/blacklisted):
 *    expect error.
 * 7. Attempt refresh with random/expired/malformed token value: expect error
 *    (simulate with invalid strings).
 * 8. Attempt token refresh for a logically deleted (deleted_at field set) seller:
 *
 *    - Simulate by removing seller (set deleted_at if practical, else skip if not
 *         possible via exposed API/hooks)
 *    - Expect generic authentication error (do not leak existence of deleted seller)
 *
 * Note: Only actual endpoints and DTOs are to be called; no direct DB
 * operations in test code. Where direct DB simulation is not permitted in E2E
 * scope, skip those cases with a comment.
 */
export async function test_api_seller_token_refresh_after_login(
  connection: api.IConnection,
) {
  // Register seller
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert(seller);
  const sellerId = seller.id;
  // Attempt to refresh with token from pending account (should fail)
  await TestValidator.error("pending seller cannot refresh token", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: seller.token.refresh,
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // (E2E cannot set approval_status or email_verified to approved/true; in real test infra, would direct DB patch or admin API -- skipping this step)

  // Login for approved, verified seller (simulate approval/verification is completed by using the login endpoint for now)
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IShoppingMallSeller.ILogin;
  const loginResult = await api.functional.auth.seller.login(connection, {
    body: loginBody,
  });
  typia.assert(loginResult);
  const origToken: IAuthorizationToken = loginResult.token;

  // Valid refresh with existing token
  const refreshBody = {
    refresh_token: origToken.refresh,
  } satisfies IShoppingMallSeller.IRefresh;
  const refreshedSeller = await api.functional.auth.seller.refresh(connection, {
    body: refreshBody,
  });
  typia.assert(refreshedSeller);
  const newToken = refreshedSeller.token;
  // Ensure both tokens were rotated
  TestValidator.notEquals(
    "access token must rotate on refresh",
    newToken.access,
    origToken.access,
  );
  TestValidator.notEquals(
    "refresh token must rotate on refresh",
    newToken.refresh,
    origToken.refresh,
  );

  // Old refresh token must be invalid after use (rotation means previous token is blacklisted)
  await TestValidator.error("old refresh token is revoked", async () => {
    await api.functional.auth.seller.refresh(connection, { body: refreshBody });
  });

  // Refresh with clearly invalid/expired/malformed tokens
  await TestValidator.error("random invalid refresh token", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: RandomGenerator.alphaNumeric(50),
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  await TestValidator.error("expired/garbage refresh token", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "0123456789abcdef0123456789abcdef",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });
  await TestValidator.error("obviously malformed token string", async () => {
    await api.functional.auth.seller.refresh(connection, {
      body: {
        refresh_token: "bad-token-format",
      } satisfies IShoppingMallSeller.IRefresh,
    });
  });

  // Edge: refresh with token of a logically deleted user
  // (No exposed API to set deleted_at / delete seller, so cannot test this in pure E2E—document as test limitation)
}
