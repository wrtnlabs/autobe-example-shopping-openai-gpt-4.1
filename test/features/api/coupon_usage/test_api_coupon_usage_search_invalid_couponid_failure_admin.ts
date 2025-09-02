import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponUsage";
import type { IPageIShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponUsage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching for coupon usages with an invalid couponId as admin
 * returns error.
 *
 * This test case ensures robust resource validation logic for coupon usage
 * queries via the admin API:
 *
 * 1. Register a brand-new admin account by calling /auth/admin/join. All
 *    credentials (username, email) are randomized for uniqueness,
 *    'is_active' is set true. Assert the response for type correctness and
 *    data structure.
 * 2. Use the automatically set Authorization header in the SDK (do not set it
 *    manually) to maintain proper admin authentication context.
 * 3. Generate a random UUID value for couponId that is guaranteed not to exist
 *    in the system. (Avoids accidental match with a real coupon.)
 * 4. Attempt a PATCH query for coupon usage records with the invalid couponId
 *    using the minimal allowed filter (empty object per schema). Do not add
 *    non-existent or optional properties.
 * 5. Verify that an error is thrown: either HTTP error (such as 404) or a
 *    business validation error (based on system logic for non-existent
 *    coupons). Use await TestValidator.error because the callback is
 *    async.
 * 6. The test passes if and only if the error is thrown; any successful coupon
 *    usage result is a failure.
 */
export async function test_api_coupon_usage_search_invalid_couponid_failure_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin account (randomized unique credentials)
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);
  // 2. Generate random couponId (guaranteed to not exist)
  const invalidCouponId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt usage query and expect error
  await TestValidator.error(
    "should return error when admin searches usages with non-existent couponId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
        connection,
        {
          couponId: invalidCouponId,
          body: {}, // Minimal valid request (no filters)
        },
      );
    },
  );
}
