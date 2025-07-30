import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate coupon detail retrieval by couponId for a discount campaign,
 * covering both successful and not-found scenarios.
 *
 * This test ensures that when a coupon is created under a campaign, it can be
 * precisely retrieved by its ID, and all relevant fields (code, status,
 * customer assignment, campaign linkage, timestamps) are correctly populated.
 * It must also check error handling when a non-existent couponId is requested
 * (expecting an appropriate 'not found' behavior).
 *
 * Steps:
 *
 * 1. Create a new discount campaign as the target for coupon issuance.
 * 2. Issue a coupon (create) using the campaign ID; save couponId for lookup.
 * 3. Retrieve coupon detail with campaignId and couponId: assert all expected
 *    IAimallBackendCoupon fields match the record returned from creation.
 * 4. Attempt to fetch a coupon under the same campaign with a random
 *    (non-existent) couponId and assert that an error is thrown (not found).
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_get_coupon_detail_success_and_not_found(
  connection: api.IConnection,
) {
  // 1. Create a new discount campaign
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: "Test Campaign - Coupon Detail",
          code: RandomGenerator.alphabets(10),
          type: "order",
          status: "active",
          stackable: true,
          start_at: new Date(Date.now() - 60 * 1000).toISOString(),
          end_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          max_uses_per_user: 1,
          priority: 10,
          description: "Coupon detail integration test campaign.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue a coupon under the campaign
  const couponData: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    customer_id: null, // universal coupon (unassigned)
    code: `COUPON${RandomGenerator.alphabets(8)}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: couponData,
      },
    );
  typia.assert(coupon);

  // 3. Retrieve coupon detail by couponId and assert correctness
  const detail =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.at(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: coupon.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("coupon detail matches record")(detail)(coupon);

  // 4. Attempt to fetch a coupon with a random non-existent couponId and assert not found
  const nonExistentCouponId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should return not-found for bogus couponId")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.coupons.at(
        connection,
        {
          discountCampaignId: campaign.id,
          couponId: nonExistentCouponId,
        },
      );
    },
  );
}
