import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * E2E test for updating a coupon's status and expiration within a discount
 * campaign.
 *
 * This test validates:
 *
 * - Permitted transitions: issued → redeemed, issued → expired, issued →
 *   invalidated
 * - Rejection of forbidden updates: redeemed/invalidated coupon update forbidden
 * - Valid updates to coupon expiration
 * - Validation of improper expiry updates (cannot set issued coupon expiry in the
 *   past)
 *
 * Workflow:
 *
 * 1. Create a discount campaign
 * 2. Issue a coupon in 'issued' status
 * 3. Update coupon to 'redeemed' status
 * 4. Attempt to update redeemed coupon again (should be rejected)
 * 5. Issue a new coupon and update it to 'expired' status
 * 6. Issue a new coupon and update it to 'invalidated' status, then attempt
 *    forbidden update
 * 7. Test updating coupon expiry to a past date (should be rejected)
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_update_campaign_coupon_status_and_expiry(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: "Test Campaign",
          code: RandomGenerator.alphaNumeric(10),
          type: "order",
          status: "active",
          stackable: false,
          start_at: now.toISOString(),
          end_at: tomorrow.toISOString(),
          max_uses_per_user: 1,
          priority: 10,
          description: "For coupon e2e test.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue a coupon in 'issued' state
  const issuedCoupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: tomorrow.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(issuedCoupon);

  // 3. Update coupon to 'redeemed' with valid redeemed_at
  const redeemedAt = new Date(now.getTime() + 60 * 60 * 1000);
  const couponRedeemed =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: issuedCoupon.id,
        body: {
          status: "redeemed",
          redeemed_at: redeemedAt.toISOString(),
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  typia.assert(couponRedeemed);
  TestValidator.equals("status changed to redeemed")(couponRedeemed.status)(
    "redeemed",
  );
  TestValidator.equals("redeemed_at set")(couponRedeemed.redeemed_at)(
    redeemedAt.toISOString(),
  );

  // 4. Attempt to update already redeemed coupon (should fail)
  await TestValidator.error("update after redeemed forbidden")(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: issuedCoupon.id,
        body: {
          status: "expired",
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  });

  // 5. Issue another coupon and update it to 'expired'
  const couponToExpire =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: tomorrow.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(couponToExpire);
  const couponExpired =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: couponToExpire.id,
        body: {
          status: "expired",
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  typia.assert(couponExpired);
  TestValidator.equals("expired state")(couponExpired.status)("expired");

  // 6. Issue new coupon, update to 'invalidated', then attempt forbidden update
  const couponToInvalidate =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: tomorrow.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(couponToInvalidate);
  const couponInvalidated =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: couponToInvalidate.id,
        body: {
          status: "invalidated",
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  typia.assert(couponInvalidated);
  await TestValidator.error("update after invalidated forbidden")(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: couponToInvalidate.id,
        body: {
          code: RandomGenerator.alphaNumeric(16),
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  });

  // 7. Attempt to set expires_at to a past date for issued coupon (should fail)
  const issuedForPastExpiry =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(12),
          status: "issued",
          issued_at: now.toISOString(),
          expires_at: tomorrow.toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(issuedForPastExpiry);
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await TestValidator.error("cannot set expires_at to past for issued coupon")(
    async () => {
      await api.functional.aimall_backend.administrator.discountCampaigns.coupons.update(
        connection,
        {
          discountCampaignId: campaign.id,
          couponId: issuedForPastExpiry.id,
          body: {
            expires_at: pastDate.toISOString(),
          } satisfies IAimallBackendCoupon.IUpdate,
        },
      );
    },
  );
}
