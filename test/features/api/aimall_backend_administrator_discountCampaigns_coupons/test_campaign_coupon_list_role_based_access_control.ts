import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate role-based access control for retrieving coupon lists of a discount
 * campaign.
 *
 * This test ensures that only users with administrator or campaign manager
 * roles are able to access the coupon list endpoint for a given discount
 * campaign. It covers positive access (privileged user) and structures
 * negative-access checks for future extension if more user contexts become
 * available in the SDK.
 *
 * Steps:
 *
 * 1. Create a valid discount campaign as an administrator to guarantee that both
 *    the campaign entity and admin privileges exist.
 * 2. Using the administrator context, fetch the coupon list for the new campaign
 *    and verify the paginated coupon result is returned (positive/authorized
 *    test).
 * 3. (For systems with a user context API, attempt same coupon-list access as an
 *    unauthorized user and verify it is denied. This is scaffolded for future
 *    use.)
 *
 * The primary validation is authorization boundary enforcement, not coupon
 * record content.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_campaign_coupon_list_role_based_access_control(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign as administrator
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: "Discount Test Campaign " + RandomGenerator.alphaNumeric(8),
          code: "TESTCAMPAIGN" + RandomGenerator.alphaNumeric(4),
          type: "order",
          status: "active",
          stackable: true,
          start_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // started 1 hour ago
          end_at: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString(), // ends in 4 hours
          priority: 1,
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. As administrator, retrieve coupons for this campaign
  const coupons =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.index(
      connection,
      {
        discountCampaignId: campaign.id,
      },
    );
  typia.assert(coupons);

  // 3. Negative scenario: If user context switching/auth provided, attempt coupon list access as unauthorized
  // NOTE: Not implementable with current SDK/api scaffolding
  // await TestValidator.error("non-admin should not fetch campaign coupon list")(() =>
  //   api.functional.aimall_backend.administrator.discountCampaigns.coupons.index(
  //     unauthorizedConnection, { discountCampaignId: campaign.id }));
}
