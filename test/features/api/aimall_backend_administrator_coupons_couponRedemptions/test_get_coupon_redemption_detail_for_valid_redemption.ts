import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate retrieving details for a specific coupon redemption by couponId &
 * couponRedemptionId.
 *
 * This simulates a realistic admin workflow:
 *
 * 1. Create a test discount campaign.
 * 2. Issue a coupon for that campaign.
 * 3. Simulate a coupon redemption event (optionally including customer/campaign
 *    context).
 * 4. Retrieve the redemption event detail using couponId & couponRedemptionId.
 * 5. Assert the redemption detail returned matches stored event: coupon reference,
 *    customer, campaign, status, order/product context, and timestamps.
 *
 * This test ensures business metadata and integrity of the coupon redemption
 * audit/event system.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_get_coupon_redemption_detail_for_valid_redemption(
  connection: api.IConnection,
) {
  // 1. Create test discount campaign
  const now = new Date();
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph()(2),
          code: RandomGenerator.alphaNumeric(10),
          type: "order",
          status: "active",
          stackable: false,
          start_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
          end_at: new Date(now.getTime() + 1000 * 60 * 60 * 24).toISOString(),
          priority: typia.random<number & tags.Type<"int32">>(),
          description: RandomGenerator.paragraph()(1),
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue a coupon for this campaign
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: new Date(
            now.getTime() + 1000 * 60 * 60 * 12,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Simulate coupon redemption event
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const order_id = typia.random<string & tags.Format<"uuid">>();
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const redemption =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      {
        couponId: coupon.id,
        body: {
          coupon_id: coupon.id,
          customer_id,
          discount_campaign_id: campaign.id,
          redeemed_at: now.toISOString(),
          redemption_status: "success",
          order_id,
          product_id,
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(redemption);

  // 4. Retrieve the redemption event by couponId & couponRedemptionId
  const result =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.at(
      connection,
      {
        couponId: coupon.id,
        couponRedemptionId: redemption.id,
      },
    );
  typia.assert(result);

  // 5. Assert the returned metadata matches the created redemption event
  TestValidator.equals("redemption id matches")(result.id)(redemption.id);
  TestValidator.equals("coupon id matches")(result.coupon_id)(
    redemption.coupon_id,
  );
  TestValidator.equals("customer id matches")(result.customer_id)(
    redemption.customer_id,
  );
  TestValidator.equals("campaign id matches")(result.discount_campaign_id)(
    redemption.discount_campaign_id,
  );
  TestValidator.equals("redeemed_at matches")(result.redeemed_at)(
    redemption.redeemed_at,
  );
  TestValidator.equals("redemption_status matches")(result.redemption_status)(
    redemption.redemption_status,
  );
  TestValidator.equals("order id matches")(result.order_id)(
    redemption.order_id,
  );
  TestValidator.equals("product id matches")(result.product_id)(
    redemption.product_id,
  );
}
