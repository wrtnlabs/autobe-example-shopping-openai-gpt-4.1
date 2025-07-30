import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate that attempting to redeem a non-reusable coupon for a second time
 * results in a business rule violation.
 *
 * This test ensures adherence to the business rule that a non-reusable coupon
 * cannot be redeemed more than once. The process includes:
 *
 * 1. Create a discount campaign to serve as the context for the coupon.
 * 2. Issue a one-use coupon attached to this campaign.
 * 3. Successfully redeem the coupon the first time.
 * 4. Attempt to redeem the coupon a second time.
 * 5. Confirm that the API returns an error (e.g., HTTP 409, rejection, or failed
 *    business logic) indicating that a second redemption is not allowed.
 *
 * This test confirms the platform resists double-redemption attempts for
 * single-use coupons, preserving integrity and enforcing correct usage policy.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_create_coupon_redemption_for_already_redeemed_coupon(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const now = new Date();
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: `Double Redemption Prevention Test - ${now.toISOString()}`,
          code: `DOUBLEREDEEM-${now.getTime()}`,
          type: "order",
          status: "active",
          stackable: false,
          start_at: now.toISOString(),
          end_at: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
          max_uses_per_user: 1,
          priority: 10,
          description: "Test campaign for double redemption prevention.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue a one-use coupon
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: `COUPON-${now.getTime()}`,
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: new Date(
            now.getTime() + 1000 * 60 * 60 * 24,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Simulate a customer context (we don't have customer creation here, so use a random UUID)
  const customer_id = typia.random<string & tags.Format<"uuid">>();

  // 4. Successfully redeem the coupon once
  const redemption =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      {
        couponId: coupon.id,
        body: {
          coupon_id: coupon.id,
          customer_id,
          discount_campaign_id: campaign.id,
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(redemption);

  // 5. Attempt to redeem the same coupon for the same customer a second time
  await TestValidator.error("double redemption must fail")(() =>
    api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      {
        couponId: coupon.id,
        body: {
          coupon_id: coupon.id,
          customer_id,
          discount_campaign_id: campaign.id,
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    ),
  );
}
