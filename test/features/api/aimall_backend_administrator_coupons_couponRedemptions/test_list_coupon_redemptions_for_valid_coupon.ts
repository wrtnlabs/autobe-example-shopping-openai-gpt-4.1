import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate the listing of all redemption events for a valid coupon as an
 * administrator.
 *
 * Coupon redemption logs are essential for audit, compliance, support case
 * tracing, and campaign performance analytics. This test ensures that when a
 * coupon is created and redeemed using both successful and failed attempts, the
 * system records all those redemption events. It then validates that the GET
 * endpoint returns the accurate, complete redemption history with all proper
 * metadata such as customer, campaign, timestamps, status, and any
 * order/product linkage.
 *
 * Steps:
 *
 * 1. Create a valid discount campaign.
 * 2. Issue a coupon bound to the campaign.
 * 3. Create two distinct coupon redemptions (with different status/context).
 * 4. Retrieve all redemption events for the coupon.
 * 5. Assert that both custom-created redemptions are present and correctly stored.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_list_coupon_redemptions_for_valid_coupon(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const campaignReq = {
    name: `Auto Camp ${RandomGenerator.alphabets(6)}`,
    code: `TESTCAMP-${RandomGenerator.alphaNumeric(8)}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    end_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    max_uses_per_user: 5,
    priority: 10,
    description: "E2E test campaign for coupon redemption list.",
  } satisfies IAimallBackendDiscountCampaign.ICreate;
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignReq },
    );
  typia.assert(campaign);

  // 2. Issue a coupon under the campaign
  const couponReq = {
    discount_campaign_id: campaign.id,
    code: `E2ECOUPON-${RandomGenerator.alphaNumeric(8)}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
  } satisfies IAimallBackendCoupon.ICreate;
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: couponReq },
    );
  typia.assert(coupon);

  // 3. Create two coupon redemption attempts (success, failed)
  // Use two unique customer_ids to verify customer mapping in response
  const customerId1 = typia.random<string & tags.Format<"uuid">>();
  const customerId2 = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();

  // a) Successful redemption
  const redemption1Req = {
    coupon_id: coupon.id,
    customer_id: customerId1,
    discount_campaign_id: campaign.id,
    redeemed_at: now.toISOString(),
    redemption_status: "success",
    order_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: null,
  } satisfies IAimallBackendCouponRedemption.ICreate;
  const redemption1 =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      { couponId: coupon.id, body: redemption1Req },
    );
  typia.assert(redemption1);

  // b) Failed redemption with a different customer and no order/product info
  const redemption2Req = {
    coupon_id: coupon.id,
    customer_id: customerId2,
    discount_campaign_id: campaign.id,
    redeemed_at: new Date(now.getTime() + 10000).toISOString(),
    redemption_status: "failed",
    order_id: null,
    product_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IAimallBackendCouponRedemption.ICreate;
  const redemption2 =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
      connection,
      { couponId: coupon.id, body: redemption2Req },
    );
  typia.assert(redemption2);

  // 4. Retrieve the redemption event list via GET
  const redemptionList =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.index(
      connection,
      { couponId: coupon.id },
    );
  typia.assert(redemptionList);

  // 5. Assert the count matches, and redemptions are correct in details
  const data = redemptionList.data;
  TestValidator.predicate("redemptions include redemption1")(
    data.some(
      (r) =>
        r.id === redemption1.id &&
        r.customer_id === customerId1 &&
        r.redemption_status === "success" &&
        r.order_id === redemption1.order_id &&
        r.product_id === null,
    ),
  );
  TestValidator.predicate("redemptions include redemption2")(
    data.some(
      (r) =>
        r.id === redemption2.id &&
        r.customer_id === customerId2 &&
        r.redemption_status === "failed" &&
        r.order_id === null &&
        r.product_id === redemption2.product_id,
    ),
  );
  // Also validate that the count is at least as many as what we created
  TestValidator.predicate("redemption count >= 2")(data.length >= 2);
}
