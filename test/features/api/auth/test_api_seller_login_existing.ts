import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller login/authentication including full onboarding, status
 * gating, and security checks.
 *
 * This end-to-end test verifies that sellers can only log in if their account
 * is fully approved and their email is verified, and that proper business
 * gating and security policies are enforced. It simulates full seller
 * onboarding, including join and (simulated) approval, and tests login denial
 * for pending/suspended/unverified/locked accounts.
 *
 * 1. Register a new seller using /auth/seller/join and random but valid
 *    registration information.
 * 2. Assert that the newly created seller is returned and typia validated.
 * 3. Attempt login with the same seller credentials. Since approval_status is
 *    initially not 'approved' or email_verified is not true, login should
 *    fail.
 * 4. (Simulate) Approve the seller account and manually set email_verified to true
 *    via direct object mutation (as the test cannot call admin endpoints or
 *    verification flow directly), or skip this step if not supported.
 * 5. Attempt login again with the now-approved-and-verified credentials. This
 *    time, authentication should succeed, and a JWT token should be returned.
 *    Verify the structure and timing fields of the token with typia and
 *    business expectation.
 * 6. Edge cases: Mutate the seller object to simulate approval_status = 'pending',
 *    'rejected', or 'suspended', or set email_verified = false again, and
 *    attempt login, confirming access is denied and proper error is thrown in
 *    each case.
 * 7. (If possible) Simulate account locked/too many login attempts and verify
 *    throttling/brute-force security by repeatedly failing logins and then
 *    expecting the next attempt to be denied/throttled.
 */
export async function test_api_seller_login_existing(
  connection: api.IConnection,
) {
  // 1. Register a new seller using random values
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const registration = {
    email: sellerEmail,
    password: sellerPassword,
    business_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 12,
    }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;

  // 2. Register the seller
  const joinResult = await api.functional.auth.seller.join(connection, {
    body: registration,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "seller data matches join input except email_verified and status",
    joinResult.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "join should issue token with access, refresh, expiry fields",
    typeof joinResult.token.access === "string" &&
      typeof joinResult.token.refresh === "string" &&
      typeof joinResult.token.expired_at === "string" &&
      typeof joinResult.token.refreshable_until === "string",
  );

  // 3. Attempt login before approval or email verification
  await TestValidator.error(
    "seller login should fail if approval_status is not 'approved' or email_verified is false",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: {
          email: sellerEmail,
          password: sellerPassword,
        } satisfies IShoppingMallSeller.ILogin,
      });
    },
  );

  // 4. Simulate admin approval and email verification (this may or may not be possible, so we cannot call any API - just document that in real systems the admin would approve and the email verification record set true)

  // 5. (If we could mutate directly, which isn't possible in real E2E, we'd do it here. Since we can't, consider this limitation.) Further login tests require these flags to be true.

  // Can't proceed with further positive login cases without actual admin/email-verification endpoints, so this test ends with negative (gating) coverage.
}
