import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test the error response when retrieving coupon redemption events for a
 * non-existent coupon ID as an administrator.
 *
 * This test ensures the API correctly throws an error (such as 404 not found)
 * when attempting to fetch redemption events for a couponId that does not exist
 * in the system.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is not tied to any created coupon.
 * 2. Attempt to retrieve coupon redemption events using this invalid couponId as
 *    an administrator.
 * 3. Verify that the API throws an error, confirming proper error handling and
 *    not-found semantics.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_list_coupon_redemptions_for_invalid_coupon_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent couponId
  const invalidCouponId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch coupon redemption events, expect API to throw for not found
  await TestValidator.error("should fail for non-existent couponId")(
    async () => {
      await api.functional.aimall_backend.administrator.coupons.couponRedemptions.index(
        connection,
        { couponId: invalidCouponId },
      );
    },
  );
}
