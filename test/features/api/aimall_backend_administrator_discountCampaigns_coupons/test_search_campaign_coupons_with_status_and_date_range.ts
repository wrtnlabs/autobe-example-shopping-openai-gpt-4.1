import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced search and paginated retrieval of coupons for a discount
 * campaign.
 *
 * This test checks the full E2E flow for campaign coupon search:
 *
 * 1. Create a new discount campaign.
 * 2. Issue several coupons under the campaign, with different statuses (issued,
 *    redeemed, expired), and varied expiry/issue dates.
 * 3. Use the PATCH search endpoint to: a. Filter by status (e.g., only returned
 *    'issued' or 'redeemed') b. Filter by date range for expiry c. Exercise
 *    pagination (limit, page params) d. Ensure only coupons matching criteria
 *    are returned, and pagination metadata is correct
 * 4. Edge: Use a status outside allowed values and confirm error is returned from
 *    API.
 *
 * The flow ensures search/filter logic, result integrity, boundary testing, and
 * validation checks.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_search_campaign_coupons_with_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create discount campaign
  const campaignInput: IAimallBackendDiscountCampaign.ICreate = {
    name: RandomGenerator.paragraph()(3),
    code: RandomGenerator.alphaNumeric(10),
    type: "order",
    status: "active",
    stackable: true,
    start_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // started yesterday
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // ends in 30 days
    max_uses_per_user: 3,
    priority: 5,
    description: "Test discount campaign for coupon search.",
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue several coupons (statuses: issued, redeemed, expired)
  const now = new Date();
  const coupons: IAimallBackendCoupon[] = [];
  const couponData = [
    // issued coupon (active window)
    {
      code: RandomGenerator.alphaNumeric(8),
      status: "issued",
      issued_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
      expires_at: new Date(
        now.getTime() + 1000 * 60 * 60 * 24 * 5,
      ).toISOString(),
    },
    // redeemed coupon (different window)
    {
      code: RandomGenerator.alphaNumeric(8),
      status: "redeemed",
      issued_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
      expires_at: new Date(
        now.getTime() + 1000 * 60 * 60 * 24 * 2,
      ).toISOString(),
    },
    // expired coupon (expiry in past)
    {
      code: RandomGenerator.alphaNumeric(8),
      status: "expired",
      issued_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
      expires_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ];

  for (const data of couponData) {
    const coupon =
      await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
        connection,
        {
          discountCampaignId: campaign.id,
          body: {
            discount_campaign_id: campaign.id,
            code: data.code,
            status: data.status,
            issued_at: data.issued_at,
            expires_at: data.expires_at,
          },
        },
      );
    typia.assert(coupon);
    coupons.push(coupon);
  }

  // 3a. Search: filter by status "issued"
  const issuedResult =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.search(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          status: "issued",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(issuedResult);
  TestValidator.predicate("only issued coupons")(
    (issuedResult.data ?? []).every((c) => c.status === "issued"),
  );

  // 3b. Search: filter by date range for expires_at
  // Should only return the coupon within this window (the redeemed one)
  const dateRangeResult =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.search(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          expires_at_from: couponData[1].expires_at,
          expires_at_to: couponData[1].expires_at,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.equals("date range only selects correct coupon")(
    (dateRangeResult.data ?? []).length,
  )(1);
  TestValidator.equals("returned coupon is correct")(
    (dateRangeResult.data ?? [])[0]?.code,
  )(couponData[1].code);

  // 3c. Pagination - create 3 more coupons so we have more than page size 2
  for (let i = 0; i < 3; ++i) {
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          discount_campaign_id: campaign.id,
          code: RandomGenerator.alphaNumeric(8),
          status: "issued",
          issued_at: new Date(
            now.getTime() - 1000 * 60 * 60 * (i + 3),
          ).toISOString(),
          expires_at: new Date(
            now.getTime() + 1000 * 60 * 60 * 24 * (i + 10),
          ).toISOString(),
        },
      },
    );
  }

  // Fetch first page (2 per page)
  const paged1 =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.search(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          limit: 2,
          page: 1,
        },
      },
    );
  typia.assert(paged1);
  TestValidator.equals("pagination limit 2, page 1")(
    (paged1.data ?? []).length,
  )(2);
  TestValidator.equals("pagination meta matches limit")(
    paged1.pagination?.limit,
  )(2);

  // Fetch second page
  const paged2 =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.search(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(paged2);
  TestValidator.equals("pagination limit 2, page 2")(
    (paged2.data ?? []).length,
  )(2);

  // 4. Search with invalid status value (should fail API validation)
  await TestValidator.error("invalid status triggers error")(async () => {
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.search(
      connection,
      {
        discountCampaignId: campaign.id,
        body: {
          status: "NOT_A_VALID_STATUS",
          limit: 1,
          page: 1,
        },
      },
    );
  });
}
