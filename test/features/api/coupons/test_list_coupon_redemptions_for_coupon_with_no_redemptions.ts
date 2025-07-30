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
 * Validate the retrieval of coupon redemption events for a coupon without
 * redemption history.
 *
 * This test verifies that when querying for redemption events on a newly
 * created coupon, where no user has redeemed it yet, the system correctly
 * returns an empty dataset.
 *
 * 1. Create a valid discount campaign (as per business requirements).
 * 2. Create a new coupon under that campaign (do not assign a customer and ensure
 *    status is 'issued').
 * 3. Retrieve the coupon redemption event list for the newly created coupon.
 * 4. Assert that the returned redemption list (`data`) is an empty array and
 *    pagination reflects zero records.
 */
export async function test_api_coupons_test_list_coupon_redemptions_for_coupon_with_no_redemptions(
  connection: api.IConnection,
) {
  // 1. Create a valid discount campaign
  const now = new Date();
  const in1hr = new Date(now.getTime() + 3600 * 1000);
  const in1day = new Date(now.getTime() + 86400 * 1000);
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          code: RandomGenerator.alphaNumeric(10),
          type: "order",
          status: "active",
          stackable: true,
          start_at: in1hr.toISOString(),
          end_at: in1day.toISOString(),
          max_uses_per_user: null,
          priority: 1,
          description:
            "Test campaign for coupon redemption list with no redemptions.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Create a coupon under the campaign (no customer assigned, not redeemed)
  const issuedAt = new Date(now.getTime() + 3700 * 1000); // after campaign starts
  const expiresAt = new Date(now.getTime() + 86400 * 1000);
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          customer_id: null,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: issuedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);
  TestValidator.equals("coupon campaign match")(coupon.discount_campaign_id)(
    campaign.id,
  );
  TestValidator.equals("coupon not redeemed")(coupon.redeemed_at)(null);

  // 3. Retrieve the redemption events for that coupon
  const redemptionPage =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.index(
      connection,
      { couponId: coupon.id },
    );
  typia.assert(redemptionPage);

  // 4. Assert the list is empty and pagination is correct
  TestValidator.equals("no redemption events")(
    Array.isArray(redemptionPage.data) && redemptionPage.data.length,
  )(0);
  TestValidator.equals("zero redemption records")(
    redemptionPage.pagination.records,
  )(0);
}
