import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate successful creation of a coupon redemption record when all business
 * conditions are satisfied.
 *
 * This test simulates the normal flow for redeeming a coupon at checkout or via
 * the admin panel. It does so by:
 *
 * 1. Creating a new coupon via the administrator coupon API (dependency)
 * 2. Preparing a customer ID that is eligible to redeem the coupon
 * 3. Creating a coupon redemption record (via admin couponRedemptions API) with
 *    valid relations
 * 4. Verifying that the redemption record is created with correct coupon/customer
 *    references, success status, and timestamps
 *
 * Steps:
 *
 * 1. Generate a valid UUID for a customer (simulate customer context, as there is
 *    no explicit customer creation API provided)
 * 2. Generate a valid UUID for a discount campaign (simulate, as there is no
 *    explicit campaign creation API provided)
 * 3. Create a coupon under that campaign (admin function)
 * 4. Attempt to redeem that coupon for the chosen customer
 * 5. Validate that the result is a new redemption record referencing coupon and
 *    customer, with 'success' status and valid timestamps
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_create_coupon_redemption_success_with_valid_coupon_limit(
  connection: api.IConnection,
) {
  // 1. Simulate a campaign context (use a random UUID)
  const discountCampaignId = typia.random<string & tags.Format<"uuid">>();
  // 2. Simulate a customer context (use a random UUID)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a new coupon assigned to that customer and campaign (status 'issued')
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: discountCampaignId,
          customer_id: customerId,
          code: `TESTCOUPON_${Math.floor(Math.random() * 100000)}`,
          status: "issued",
          issued_at: new Date(Date.now() - 60000).toISOString(), // 1 minute in the past
          expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour in the future
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 4. Redeem the coupon (using status 'success' for audit field)
  const now = new Date().toISOString();
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon.id,
          customer_id: customerId,
          discount_campaign_id: discountCampaignId,
          redeemed_at: now,
          redemption_status: "success",
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(redemption);
  // 5. Assertion checks
  TestValidator.equals("coupon id matches")(redemption.coupon_id)(coupon.id);
  TestValidator.equals("customer id matches")(redemption.customer_id)(
    customerId,
  );
  TestValidator.equals("campaign id matches")(redemption.discount_campaign_id)(
    discountCampaignId,
  );
  TestValidator.equals("status is success")(redemption.redemption_status)(
    "success",
  );
  TestValidator.predicate("redeemed_at is ISO string")(
    !isNaN(Date.parse(redemption.redeemed_at)),
  );
}
