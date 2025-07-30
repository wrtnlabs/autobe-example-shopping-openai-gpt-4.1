import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced filtering of coupon redemptions by status for a specific
 * coupon.
 *
 * This scenario validates that the coupon redemptions PATCH endpoint supports
 * filtering by `redemption_status`, returning only matching redemption records
 * for a given coupon.
 *
 * Business context:
 *
 * - Coupon redemptions are auditable events tracked per coupon, each with a
 *   status such as 'success' or 'failed'.
 * - Administrators must be able to filter redemption records by status for
 *   compliance, fraud monitoring, and reporting.
 *
 * Steps implemented:
 *
 * 1. Create a discount campaign to associate the coupon under test.
 * 2. Issue a new coupon under that campaign.
 * 3. Create multiple coupon redemptions for the coupon, with a mix of 'success'
 *    and 'failed' statuses.
 * 4. Use the advanced search (PATCH) endpoint for coupon redemptions, applying a
 *    filter for 'success' status.
 * 5. Assert that every returned redemption record has 'redemption_status' ===
 *    'success' and belongs to the tested coupon; verify total count matches
 *    expectations.
 * 6. Edge: Also filter for 'failed' status and check that only 'failed' records
 *    are returned, confirming the filter works for multiple statuses.
 */
export async function test_api_couponRedemption_test_search_coupon_redemptions_with_status_filter(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign for coupon issuance
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      {
        body: {
          name: "Redemption Filter Test Campaign",
          code: `REDM-FLT-${typia.random<string>()}`,
          type: "order",
          status: "active",
          stackable: false,
          start_at: new Date(Date.now() - 60000).toISOString(),
          end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          max_uses_per_user: 10,
          priority: 1,
          description: "Test campaign for coupon redemptions filtering.",
        } satisfies IAimallBackendDiscountCampaign.ICreate,
      },
    );
  typia.assert(campaign);

  // 2. Issue the coupon under test
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: `COUPFLT-${typia.random<string>()}`,
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Create multiple coupon redemptions (mix of 'success' and 'failed')
  const customerIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const redemptions: IAimallBackendCouponRedemption[] = [];
  // 2 for 'success' and 2 for 'failed'
  for (let i = 0; i < 4; ++i) {
    const status = i < 2 ? "success" : "failed";
    const redemption =
      await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
        connection,
        {
          couponId: coupon.id,
          body: {
            coupon_id: coupon.id,
            customer_id: customerIds[i],
            redeemed_at: new Date(Date.now() + i * 1000).toISOString(),
            redemption_status: status,
          } satisfies IAimallBackendCouponRedemption.ICreate,
        },
      );
    typia.assert(redemption);
    redemptions.push(redemption);
  }

  // 4. Use the PATCH endpoint to filter for 'success' redemptions
  const resultSuccess =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
      connection,
      {
        couponId: coupon.id,
        body: {
          redemption_status: "success",
        } satisfies IAimallBackendCouponRedemption.IRequest,
      },
    );
  typia.assert(resultSuccess);
  TestValidator.predicate("all records are 'success'")(
    resultSuccess.data.every((r) => r.redemption_status === "success"),
  );
  TestValidator.equals("success redemption count")(resultSuccess.data.length)(
    2,
  );
  TestValidator.predicate("all couponIds match")(
    resultSuccess.data.every((r) => r.coupon_id === coupon.id),
  );

  // 5. Edge: Filter for 'failed' redemptions
  const resultFailed =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
      connection,
      {
        couponId: coupon.id,
        body: {
          redemption_status: "failed",
        } satisfies IAimallBackendCouponRedemption.IRequest,
      },
    );
  typia.assert(resultFailed);
  TestValidator.predicate("all records are 'failed'")(
    resultFailed.data.every((r) => r.redemption_status === "failed"),
  );
  TestValidator.equals("failed redemption count")(resultFailed.data.length)(2);
  TestValidator.predicate("all couponIds match (failed)")(
    resultFailed.data.every((r) => r.coupon_id === coupon.id),
  );
}
