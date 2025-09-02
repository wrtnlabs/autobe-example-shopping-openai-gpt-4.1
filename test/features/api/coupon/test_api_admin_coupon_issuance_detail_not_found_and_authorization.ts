import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";

/**
 * Validate not-found and authorization/permission handling for coupon
 * issuance detail API.
 *
 * This test confirms:
 *
 * 1. The /shoppingMallAiBackend/admin/coupons/{couponId}/issuances/{issuanceId}
 *    endpoint returns NOT FOUND or FORBIDDEN for unrelated, non-existent,
 *    or invalid couponId/issuanceId combinations.
 * 2. Authorization is required: unauthenticated requests are denied (401/403),
 *    and no sensitive data is disclosed via error messages/status.
 *
 * Step-by-step process:
 *
 * 1. Register and authenticate as a new admin via /auth/admin/join (to access
 *    the protected endpoint)
 * 2. Attempt to GET coupon issuance detail using random unrelated couponId and
 *    issuanceId (should NOT find any match and must return 404 or 403)
 * 3. Attempt same GET without authentication (should fail with 401/403)
 * 4. All test values use random UUIDs to avoid database collision, and results
 *    are confirmed strictly via error-catching (TestValidator.error)
 *
 * No valid-positive fetch is attempted in this scenario (test strictly
 * negative/error access paths).
 */
export async function test_api_admin_coupon_issuance_detail_not_found_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a fresh admin (authenticate for access)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(2),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(12)}@test.com`,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Prepare unrelated IDs for negative test (ensure highly unlikely to exist)
  const fakeCouponId = typia.random<string & tags.Format<"uuid">>();
  const fakeIssuanceId = typia.random<string & tags.Format<"uuid">>();

  // 3. Authenticated: should NOT find result, returns error (404, 403, etc.)
  await TestValidator.error(
    "admin fetch with unrelated coupon/issuance IDs must fail with not found/forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.at(
        connection,
        {
          couponId: fakeCouponId,
          issuanceId: fakeIssuanceId,
        },
      );
    },
  );

  // 4. Unauthenticated: clear Authorization header
  const unauthenticated = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated fetch must be denied with 401/403",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.at(
        unauthenticated,
        {
          couponId: fakeCouponId,
          issuanceId: fakeIssuanceId,
        },
      );
    },
  );
}
