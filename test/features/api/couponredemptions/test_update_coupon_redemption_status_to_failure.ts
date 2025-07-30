import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate administrative update of a coupon redemption record status to
 * failure (e.g., due to fraud or error).
 *
 * This test confirms:
 *
 * - An admin can update a coupon redemption record's `redemption_status` (and
 *   other updatable fields)
 * - Only allowed fields are changed and system audit rules are respected
 * - The workflow: create coupon → create redemption event → set status to
 *   'failed'
 *
 * Steps:
 *
 * 1. Create a coupon for a campaign.
 * 2. Redeem the coupon by creating a coupon redemption record for a customer (with
 *    initial status 'success').
 * 3. Admin updates the redemption record’s status to 'failed'.
 * 4. Validate that the update has been applied and all primary fields (ids,
 *    timestamps) and tracked field modifications are correct.
 */
export async function test_api_couponRedemptions_test_update_coupon_redemption_status_to_failure(
  connection: api.IConnection,
) {
  // 1. Create a coupon for a campaign
  const campaignId: string = typia.random<string & tags.Format<"uuid">>();
  const customerId: string = typia.random<string & tags.Format<"uuid">>();
  const couponCreateInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaignId,
    customer_id: customerId,
    code: RandomGenerator.alphaNumeric(10),
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // +7 days
  };
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: couponCreateInput },
    );
  typia.assert(coupon);

  // 2. Redeem the coupon (create redemption record)
  const redemptionCreateInput: IAimallBackendCouponRedemption.ICreate = {
    coupon_id: coupon.id,
    customer_id: customerId,
    discount_campaign_id: campaignId,
    redeemed_at: new Date().toISOString(),
    redemption_status: "success",
    order_id: null,
    product_id: null,
  };
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      { body: redemptionCreateInput },
    );
  typia.assert(redemption);

  // 3. Update the redemption record status to 'failed'
  const updateInput: IAimallBackendCouponRedemption.IUpdate = {
    redemption_status: "failed",
    // optionally, could update other updatable fields for broader coverage
    // order_id: typia.random<string & tags.Format<'uuid'>>(),
  };
  const updated =
    await api.functional.aimall_backend.administrator.couponRedemptions.update(
      connection,
      { couponRedemptionId: redemption.id, body: updateInput },
    );
  typia.assert(updated);

  // 4. Validate the update
  TestValidator.equals("redemption_status updated")(updated.redemption_status)(
    "failed",
  );
  TestValidator.equals("record id unchanged")(updated.id)(redemption.id);
  TestValidator.equals("coupon id unchanged")(updated.coupon_id)(coupon.id);
  TestValidator.equals("customer id unchanged")(updated.customer_id)(
    customerId,
  );
  // Confirm that redeemed_at is not modified
  TestValidator.equals("redemption date unchanged")(updated.redeemed_at)(
    redemption.redeemed_at,
  );
  // Confirm unchanged status for fields not in the update
  TestValidator.equals("campaign id unchanged")(updated.discount_campaign_id)(
    redemption.discount_campaign_id,
  );
}
