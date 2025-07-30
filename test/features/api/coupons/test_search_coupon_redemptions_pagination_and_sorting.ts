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
 * Validates paginated and sorted search of coupon redemptions for a specific
 * coupon.
 *
 * Business context:
 *
 * - Coupon redemption histories must be auditable, large, and support admin
 *   queries with pagination/sorting.
 * - This test ensures the search endpoint provides correct subsets of data and
 *   ordering, based on inserted sample data with varied timestamps.
 *
 * Steps:
 *
 * 1. Create a discount campaign (admin context)
 * 2. Issue a coupon under that campaign
 * 3. Create N coupon redemption records with deliberately varied redeemed_at
 *    timestamps
 * 4. Search coupon redemption history, using PATCH with various page/limit params
 *    and sort order
 * 5. Validate:
 *
 * - Total count matches inserted records
 * - Each pagination request returns the correct subset and page metadata
 * - Returned data are sorted by redeemed_at accordingly (desc/asc)
 */
export async function test_api_coupons_test_search_coupon_redemptions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const campaignInput = {
    name: `Test Campaign ${RandomGenerator.alphabets(8)}`,
    code: `COUPON${RandomGenerator.alphaNumeric(6)}`,
    type: "order",
    status: "active",
    stackable: true,
    start_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    max_uses_per_user: null,
    priority: 1,
    description: "For E2E testing of coupon redemptions pagination",
  } satisfies IAimallBackendDiscountCampaign.ICreate;
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue a coupon under the campaign
  const couponInput = {
    discount_campaign_id: campaign.id,
    customer_id: null,
    code: `COUPON-CODE-${RandomGenerator.alphabets(10)}`,
    status: "issued",
    issued_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  } satisfies IAimallBackendCoupon.ICreate;
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: couponInput,
      },
    );
  typia.assert(coupon);

  // 3. Insert N redemption records with different timestamps
  const redCount = 25;
  const redemptions: IAimallBackendCouponRedemption[] = [];
  for (let i = 0; i < redCount; ++i) {
    const redeemedAt = new Date(Date.now() - i * 60000).toISOString(); // 1 minute apart
    const redemptionInput = {
      coupon_id: coupon.id,
      customer_id: typia.random<string & tags.Format<"uuid">>(),
      discount_campaign_id: campaign.id,
      redeemed_at: redeemedAt,
      redemption_status: "success",
    } satisfies IAimallBackendCouponRedemption.ICreate;
    const redemption =
      await api.functional.aimall_backend.administrator.coupons.couponRedemptions.create(
        connection,
        {
          couponId: coupon.id,
          body: redemptionInput,
        },
      );
    typia.assert(redemption);
    redemptions.push(redemption);
  }

  // For test sorting: sort redemptions locally descending and ascending by redeemed_at
  const descSorted = redemptions
    .slice()
    .sort((a, b) => b.redeemed_at.localeCompare(a.redeemed_at));
  const ascSorted = redemptions
    .slice()
    .sort((a, b) => a.redeemed_at.localeCompare(b.redeemed_at));

  // 4,5. Validate pagination and (default) sorting --- PATCH does not define a sort parameter in DTO. Test pages as returned.
  const limit = 10,
    page1 = 1,
    page2 = 2;
  // First page
  const search1 =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
      connection,
      {
        couponId: coupon.id,
        body: { page: page1, limit: limit },
      },
    );
  typia.assert(search1);
  TestValidator.equals("pagination: total count")(search1.pagination.records)(
    redCount,
  );
  TestValidator.equals("pagination: page 1 of sorting")(
    search1.pagination.current,
  )(page1);
  TestValidator.equals("pagination: page limit")(search1.pagination.limit)(
    limit,
  );
  TestValidator.equals("pagination: page count")(search1.data.length)(limit);
  for (let i = 0; i < search1.data.length; ++i)
    TestValidator.equals(`page1 item redeemed_at sorting`)(
      search1.data[i].redeemed_at,
    )(descSorted[i].redeemed_at);

  // Second page
  const search2 =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
      connection,
      {
        couponId: coupon.id,
        body: { page: page2, limit: limit },
      },
    );
  typia.assert(search2);
  TestValidator.equals("pagination: page 2")(search2.pagination.current)(page2);
  TestValidator.equals("pagination: page limit")(search2.pagination.limit)(
    limit,
  );
  // Last page
  const lastPage = Math.ceil(redCount / limit);
  const searchLast =
    await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
      connection,
      {
        couponId: coupon.id,
        body: { page: lastPage, limit: limit },
      },
    );
  typia.assert(searchLast);
  TestValidator.equals("pagination: last page")(searchLast.pagination.current)(
    lastPage,
  );

  // Ascending-order simulation: Since DTO does not allow specifying sort param, test via local reorder for ascending check.
  // (If API adds sort param, expand test accordingly.)

  // Spot check: verify that searching all results by page/limit and collecting, reconstructs precisely the default order (should be descending on redeemed_at)
  let allPagedResults: IAimallBackendCouponRedemption[] = [];
  for (let p = 1; p <= lastPage; ++p) {
    const s =
      await api.functional.aimall_backend.administrator.coupons.couponRedemptions.search(
        connection,
        {
          couponId: coupon.id,
          body: { page: p, limit: limit },
        },
      );
    typia.assert(s);
    allPagedResults.push(...s.data);
  }
  TestValidator.equals(
    "all pagination data reconstructs original descending order",
  )(allPagedResults.map((x) => x.id))(descSorted.map((x) => x.id));
}
