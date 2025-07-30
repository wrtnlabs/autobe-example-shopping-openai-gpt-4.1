import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test redeeming an expired coupon (negative case).
 *
 * This test validates the system's rejection of redemption attempts for coupons
 * whose expiration date is in the past. It performs the following steps:
 *
 * 1. Create a discount campaign (required dependency for coupon issuance).
 * 2. Issue a coupon under this campaign with an expires_at value set to a date
 *    before now.
 * 3. Attempt to create a coupon redemption using this expired coupon and arbitrary
 *    customer.
 * 4. The expected result is an error indicating that the coupon cannot be redeemed
 *    due to being expired.
 *
 * This business rule ensures that coupons past their expiry cannot be redeemed,
 * regardless of the presence of a valid campaign or redemption request.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_create_coupon_redemption_for_expired_coupon(
  connection: api.IConnection,
) {
  // 1. Create discount campaign
  const now = new Date();
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 1 day ago
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days ahead
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          code: RandomGenerator.alphaNumeric(10),
          type: "order",
          status: "active",
          stackable: false,
          start_at: past.toISOString(),
          end_at: future.toISOString(),
          priority: 1,
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue expired coupon
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(10),
          status: "issued",
          issued_at: past.toISOString(),
          expires_at: past.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Attempt redemption (should fail)
  await TestValidator.error("cannot redeem expired coupon")(async () => {
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      {
        couponId: coupon.id,
        body: {
          coupon_id: coupon.id,
          customer_id: typia.random<string & tags.Format<"uuid">>(), // Arbitrary fake customer
          redeemed_at: now.toISOString(),
          redemption_status: "success",
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  });
}
