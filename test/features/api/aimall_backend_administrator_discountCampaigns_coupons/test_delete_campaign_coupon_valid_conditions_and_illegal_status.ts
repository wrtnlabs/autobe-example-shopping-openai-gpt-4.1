import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test deletion (hard delete) of coupons from a discount campaign, according to
 * business rules.
 *
 * This test covers the following:
 *
 * 1. Creating a discount campaign.
 * 2. Issuing coupons with both 'issued' and 'redeemed' status.
 * 3. Deleting the coupon in 'issued' status and verifying deletion.
 * 4. Attempting to delete a coupon in 'redeemed' status (should fail).
 * 5. Attempting to delete already deleted and fully non-existent coupons (should
 *    fail).
 *
 * Business rules:
 *
 * - Only coupons with status 'issued' (and possibly 'invalidated') can be
 *   deleted.
 * - Coupons that are 'redeemed' or 'expired' cannot be deleted; such attempts
 *   return business rule errors.
 * - Deleting a non-existent coupon (or one already deleted) must result in a
 *   not-found error.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_delete_campaign_coupon_valid_conditions_and_illegal_status(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const campaignInput: IAimallBackendDiscountCampaign.ICreate = {
    name: `Campaign-${RandomGenerator.alphaNumeric(8)}`,
    code: `CODE${RandomGenerator.alphaNumeric(4)}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() - 3600000).toISOString(), // started 1 hour ago
    end_at: new Date(Date.now() + 86400000).toISOString(), // ends in 24h
    priority: 10,
    description: "Test campaign",
    max_uses_per_user: 1,
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue a coupon in 'issued' status
  const couponIssuedInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    code: `COUPON-ISSUED-${RandomGenerator.alphaNumeric(6)}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 36000000).toISOString(),
  };
  const couponIssued =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: couponIssuedInput,
      },
    );
  typia.assert(couponIssued);

  // 3. Issue a coupon in 'redeemed' status
  const couponRedeemedInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: campaign.id,
    code: `COUPON-REDEEMED-${RandomGenerator.alphaNumeric(6)}`,
    status: "redeemed",
    issued_at: new Date(Date.now() - 7200000).toISOString(), // issued 2 hours ago
    expires_at: new Date(Date.now() + 36000000).toISOString(),
  };
  const couponRedeemed =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: couponRedeemedInput,
      },
    );
  typia.assert(couponRedeemed);

  // 4. Delete the 'issued' coupon (should succeed)
  await api.functional.aimall_backend.administrator.discountCampaigns.coupons.erase(
    connection,
    {
      discountCampaignId: campaign.id,
      couponId: couponIssued.id,
    },
  );

  // 5. Try deleting the already deleted coupon again (should fail - not found)
  await TestValidator.error(
    "Deleting an already deleted coupon should return not-found",
  )(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.coupons.erase(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: couponIssued.id,
      },
    ),
  );

  // 6. Try deleting a 'redeemed' coupon (should fail - business rule)
  await TestValidator.error(
    "Deleting a redeemed coupon should fail by business rule",
  )(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.coupons.erase(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: couponRedeemed.id,
      },
    ),
  );

  // 7. Try deleting a completely non-existent coupon (should fail - not found)
  await TestValidator.error(
    "Deleting a random non-existent coupon must return not-found",
  )(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.coupons.erase(
      connection,
      {
        discountCampaignId: campaign.id,
        couponId: typia.random<string & tags.Format<"uuid">>(),
      },
    ),
  );
}
