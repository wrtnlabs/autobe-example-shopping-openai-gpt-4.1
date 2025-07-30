import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test creation of a coupon redemption when the coupon is eligible (valid and
 * assigned)
 *
 * This test validates that a coupon redemption can successfully be created for
 * a coupon that is:
 *
 * - Issued and active (not expired)
 * - Assigned/linked to a customer
 * - Associated with an existing, active discount campaign
 * - Within valid time windows (not expired or not-yet-valid)
 *
 * Workflow:
 *
 * 1. Create a new discount campaign and verify it is created correctly.
 * 2. Issue a new coupon under this campaign, assigned to a synthetic (random)
 *    customer and set status to 'issued', valid-from and valid-until dates set
 *    to cover 'eligible' scenario.
 * 3. Create a coupon redemption event for the just-issued coupon, as 'success'.
 * 4. Validate the returned redemption record for correct associations and business
 *    rules.
 *
 * Preconditions: System is empty and all random UUIDs are used to avoid
 * collisions. Test is fully self-contained.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_create_coupon_redemption_for_eligible_coupon(
  connection: api.IConnection,
) {
  // 1. Create a valid discount campaign for coupon issuance
  const now = new Date();
  const campaignCreate: IAimallBackendDiscountCampaign.ICreate = {
    name: "Summer Sale",
    code: `SUMMER_${Date.now()}`,
    type: "order",
    status: "active",
    stackable: true,
    start_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // started 30 min ago
    end_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // ends in 24 hours
    max_uses_per_user: 3,
    priority: 100,
    description: "Automated test campaign for coupon redemption",
  };

  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignCreate },
    );
  typia.assert(campaign);

  // 2. Issue an eligible coupon linked to this campaign and a synthetic customer
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const couponCreate: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    customer_id: customerId,
    code: `COUPON_${Date.now()}`,
    status: "issued",
    issued_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString(), // issued 10 min ago
    expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // expires in 2 hours
  };
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: couponCreate,
      },
    );
  typia.assert(coupon);

  // 3. Create a coupon redemption event with valid/linked data
  const redemptionCreate: IAimallBackendCouponRedemption.ICreate = {
    coupon_id: coupon.id,
    customer_id: customerId,
    discount_campaign_id: campaign.id,
    redeemed_at: new Date().toISOString(),
    redemption_status: "success",
  };
  const redemption =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      {
        couponId: coupon.id,
        body: redemptionCreate,
      },
    );
  typia.assert(redemption);

  // 4. Validate the properties and association of the returned redemption record
  TestValidator.equals("coupon_id")(redemption.coupon_id)(coupon.id);
  TestValidator.equals("customer_id")(redemption.customer_id)(customerId);
  TestValidator.equals("discount_campaign_id")(redemption.discount_campaign_id)(
    campaign.id,
  );
  TestValidator.equals("redemption_status")(redemption.redemption_status)(
    "success",
  );
  TestValidator.equals("redemption redeemed_at today")(
    redemption.redeemed_at.substring(0, 10),
  )(new Date().toISOString().substring(0, 10));
}
