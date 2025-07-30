import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate error-handling when fetching coupon redemption detail with an
 * invalid couponRedemptionId
 *
 * This test ensures proper error is returned when requesting the details of a
 * redemption event using a valid couponId but a couponRedemptionId that does
 * not exist in the system (random UUID).
 *
 * Business context: It is likely for admin/support personnel to request
 * drill-down on event logs or redemption history, but the requested event may
 * have been deleted, never existed, mistyped, or otherwise absent. Correct
 * error handling, such as 404 Not Found or a controlled business error, is
 * necessary in this user story.
 *
 * Test process:
 *
 * 1. Create a new discount campaign (dependency, since coupon must belong to a
 *    campaign).
 * 2. Create a coupon under this campaign.
 * 3. Attempt to retrieve a coupon redemption event for the created couponId, but
 *    with a random (presumed invalid/non-existent) couponRedemptionId.
 * 4. Verify that error (e.g., not found) is thrown, not a successful result.
 */
export async function test_api_aimall_backend_administrator_coupons_couponRedemptions_test_get_coupon_redemption_detail_for_invalid_redemption_id(
  connection: api.IConnection,
) {
  // 1. Set up: Create new discount campaign
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          code: `CAMPAIGN-${typia.random<string & tags.Format<"uuid">>().substr(0, 8)}`,
          type: "order",
          status: "active",
          stackable: true,
          start_at: new Date(Date.now() - 100000).toISOString(),
          end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          priority: 1,
          description: "Test campaign for invalid redemption detail test",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Create a coupon for this campaign
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: `COUPON-${typia.random<string & tags.Format<"uuid">>().substr(0, 8)}`,
          status: "issued",
          issued_at: new Date(Date.now() - 10000).toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Attempt to fetch coupon redemption with a non-existent couponRedemptionId
  await TestValidator.error("Redemption detail not found")(async () => {
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.at(
      connection,
      {
        couponId: coupon.id,
        couponRedemptionId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
