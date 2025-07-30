import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate successful hard deletion of a coupon redemption event by an
 * administrator.
 *
 * Business context: This scenario tests the end-to-end admin flow for deleting
 * a coupon redemption audit event, ensuring compliance and lifecycle
 * correctness. It covers the full path—campaign and coupon creation, redemption
 * event, and admin deletion. Since there is no API to fetch coupon redemption
 * by ID or to list deleted items, the test validates the absence of errors up
 * to and including deletion. Further runtime validation upon deletion is
 * limited to the lack of retrieval endpoint.
 *
 * Steps:
 *
 * 1. Admin creates a discount campaign for coupon issuance
 * 2. Admin issues a coupon to a specific mock customer
 * 3. Admin logs a coupon redemption event for that coupon/customer
 * 4. Admin deletes the coupon redemption by its unique ID
 * 5. (Note) Since no read API is provided for redemption retrieval, we presume
 *    deletion on lack of errors
 */
export async function test_api_couponRedemption_test_delete_coupon_redemption_successfully_as_administrator(
  connection: api.IConnection,
) {
  // 1. Admin creates discount campaign
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          code: RandomGenerator.alphaNumeric(8),
          type: "order",
          status: "active",
          stackable: false,
          start_at: new Date().toISOString(),
          end_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
          max_uses_per_user: 1,
          priority: 1,
          description: "Test campaign for coupon redemption deletion.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Admin issues a coupon to a mock customer
  const customerId: string = typia.random<string & tags.Format<"uuid">>();
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          customer_id: customerId,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 14 * 24 * 3600 * 1000,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Admin logs a coupon redemption event for the issued coupon
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon.id,
          customer_id: customerId,
          discount_campaign_id: campaign.id,
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
          order_id: null,
          product_id: null,
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(redemption);

  // 4. Admin deletes the couponRedemption record by its ID
  await api.functional.aimall_backend.administrator.coupons.couponRedemptions.erase(
    connection,
    {
      couponId: coupon.id,
      couponRedemptionId: redemption.id,
    },
  );
  // 5. (Note) No further runtime validation is possible due to lack of fetch/list APIs for coupon redemptions. If no error is thrown above, hard deletion is presumed.
}
