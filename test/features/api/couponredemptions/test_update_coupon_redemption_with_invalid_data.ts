import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate error handling on coupon redemption update with invalid business
 * data.
 *
 * The test verifies that attempts to update a coupon redemption record with
 * invalid data— such as an unsupported redemption status or an incorrectly
 * associated customer/campaign— are properly rejected by the API with
 * business/validation error.
 *
 * This test performs the following steps:
 *
 * 1. Create a new discount campaign to allow coupon and redemption creation
 * 2. Issue a coupon under the campaign
 * 3. Create an initial valid coupon redemption for the coupon
 * 4. Attempt to update the coupon redemption with an invalid status and/or broken
 *    business logic
 * 5. Assert that a validation/business rule error is thrown by the API
 */
export async function test_api_couponredemptions_test_update_coupon_redemption_with_invalid_data(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const campaignInput: IAimallBackendDiscountCampaign.ICreate = {
    name: `Test Campaign ${RandomGenerator.alphaNumeric(4)}`,
    code: `CODE${RandomGenerator.alphaNumeric(5)}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    priority: 1,
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue a coupon for the campaign
  const couponInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    code: `C${RandomGenerator.alphaNumeric(8)}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
  };
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: couponInput },
    );
  typia.assert(coupon);

  // 3. Create a valid coupon redemption event
  const validRedemptionInput: IAimallBackendCouponRedemption.ICreate = {
    coupon_id: coupon.id,
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    redeemed_at: new Date().toISOString(),
    redemption_status: "success",
  };
  const redemption =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      { couponId: coupon.id, body: validRedemptionInput },
    );
  typia.assert(redemption);

  // 4. Attempt invalid update: e.g., set an invalid status value and a bogus campaign id
  const invalidUpdateData: IAimallBackendCouponRedemption.IUpdate = {
    // Intentionally invalid status (should not be accepted by business logic; e.g., not allowed enum string)
    redemption_status: "foobar-invalid-status",
    // Bogus campaign id (not really referencing an actual campaign, may be forbidden)
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
  };
  // 5. Assert error is thrown during update
  await TestValidator.error("invalid coupon redemption update triggers error")(
    async () => {
      await api.functional.aimall_backend.administrator.coupons.couponRedemptions.update(
        connection,
        {
          couponId: coupon.id,
          couponRedemptionId: redemption.id,
          body: invalidUpdateData,
        },
      );
    },
  );
}
