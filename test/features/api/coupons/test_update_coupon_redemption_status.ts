import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate updating coupon redemption status (status workflow for
 * couponRedemptions).
 *
 * This test ensures the coupon redemption status update workflow functions as
 * intended, covering both positive and negative business cases.
 *
 * Steps:
 *
 * 1. Create a new discount campaign as administrator (prerequisite for coupon
 *    creation).
 * 2. Issue a new coupon for the created campaign, initial status 'issued'.
 * 3. Create a coupon redemption record for this coupon, in 'pending' status.
 * 4. Update the coupon redemption status to a different valid value (e.g., from
 *    'pending' to 'success').
 *
 *    - Assert status field updates correctly in response.
 *    - Assert other fields remain unchanged unless specifically changed.
 * 5. Try an invalid status transition (e.g., set redemption_status to an
 *    unsupported string).
 *
 *    - Assert API enforces business rule and returns error for invalid scenario.
 */
export async function test_api_coupons_test_update_coupon_redemption_status(
  connection: api.IConnection,
) {
  // 1. Create discount campaign (admin)
  const campaignCreate: IAimallBackendDiscountCampaign.ICreate = {
    name: "RedemptionStatusTestCampaign-" + RandomGenerator.alphaNumeric(6),
    code: "RSCODE-" + RandomGenerator.alphaNumeric(6),
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    max_uses_per_user: 2,
    priority: 10,
    description: "End-to-end test campaign for coupon redemption status update",
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignCreate },
    );
  typia.assert(campaign);

  // 2. Issue coupon for campaign
  const couponCreate: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    code: "TESTCOUPON-" + RandomGenerator.alphaNumeric(6),
    status: "issued",
    issued_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(),
  };
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: couponCreate },
    );
  typia.assert(coupon);

  // 3. Create redemption record (pending status)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date().toISOString();
  const redemptionCreate: IAimallBackendCouponRedemption.ICreate = {
    coupon_id: coupon.id,
    customer_id: customerId,
    redeemed_at: now,
    redemption_status: "pending",
  };
  const redemption =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      { couponId: coupon.id, body: redemptionCreate },
    );
  typia.assert(redemption);
  TestValidator.equals("redemption status should be pending")(
    redemption.redemption_status,
  )("pending");
  TestValidator.equals("customer id should match")(redemption.customer_id)(
    customerId,
  );

  // 4. Update: pending -> success
  const updateBody: IAimallBackendCouponRedemption.IUpdate = {
    redemption_status: "success",
  };
  const updated =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.update(
      connection,
      {
        couponId: coupon.id,
        couponRedemptionId: redemption.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("redemption status updated to success")(
    updated.redemption_status,
  )("success");
  TestValidator.equals("customer id unchanged after update")(
    updated.customer_id,
  )(customerId);
  TestValidator.equals("coupon id remains same")(updated.coupon_id)(coupon.id);

  // 5. Attempt illegal status transition (set to unsupported string)
  await TestValidator.error("invalid status triggers error")(async () => {
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.update(
      connection,
      {
        couponId: coupon.id,
        couponRedemptionId: redemption.id,
        body: { redemption_status: "invalid-status-value" },
      },
    );
  });
}
