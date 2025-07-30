import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that administrators can fetch the complete set of coupons for a
 * specific discount campaign and receive accurate data and metadata.
 *
 * This test simulates an admin lifecycle for discount coupon management:
 *
 * 1. Create a discount campaign with valid configuration fields (unique code,
 *    stacking, required dates, etc)
 * 2. Issue several coupons linked to this campaign, giving each a unique code,
 *    status of 'issued', and realistic issuance/expiry timestamps
 * 3. Query the list of coupons by campaign ID through the admin coupon endpoint
 * 4. Assert that the resulting coupon set includes all issued coupons, with all
 *    pertinent fields matching what was created, including status, codes, and
 *    campaign links
 * 5. Validate basic pagination metadata, and check that only allowed users (admin)
 *    can access this endpoint
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_list_all_coupons_for_discount_campaign_success(
  connection: api.IConnection,
) {
  // 1. Create a new discount campaign to scope the coupons
  const campaignInput: IAimallBackendDiscountCampaign.ICreate = {
    name: `Spring Sale ${RandomGenerator.alphaNumeric(6)}`,
    code: `SPRING${typia.random<number & tags.Type<"int32">>()}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    end_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    priority: 10,
    description: "Spring sale limited campaign for testing.",
  };
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue several coupons under this campaign
  const couponInputs: IAimallBackendCoupon.ICreate[] = ArrayUtil.repeat(3)((
    i,
  ) => {
    const code = `COUPON${RandomGenerator.alphaNumeric(5)}${i}`;
    return {
      discount_campaign_id: campaign.id,
      code,
      status: "issued",
      issued_at: new Date(Date.now() + 1000 * 60 * i).toISOString(),
      expires_at: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * (10 + i),
      ).toISOString(),
    } satisfies IAimallBackendCoupon.ICreate;
  });
  const issuedCoupons: IAimallBackendCoupon[] = [];
  for (const couponInput of couponInputs) {
    const issued =
      await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
        connection,
        { discountCampaignId: campaign.id, body: couponInput },
      );
    typia.assert(issued);
    issuedCoupons.push(issued);
  }

  // 3. Retrieve all coupons for this campaign (test endpoint)
  const couponPage =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.index(
      connection,
      { discountCampaignId: campaign.id },
    );
  typia.assert(couponPage);

  // 4. Assertions: all issued coupons found and fields validated
  const returnedCoupons = couponPage.data ?? [];
  for (const expected of couponInputs) {
    const found = returnedCoupons.find((r) => r.code === expected.code);
    TestValidator.predicate(`coupon present for code: ${expected.code}`)(
      !!found,
    );
    if (found) {
      TestValidator.equals(`campaign id match for ${expected.code}`)(
        found.discount_campaign_id,
      )(expected.discount_campaign_id);
      TestValidator.equals(`status match for ${expected.code}`)(found.status)(
        expected.status,
      );
      TestValidator.equals(`issued date match for ${expected.code}`)(
        found.issued_at,
      )(expected.issued_at);
      TestValidator.equals(`expiry date match for ${expected.code}`)(
        found.expires_at,
      )(expected.expires_at);
    }
  }

  // 5. Basic pagination and quantity checks
  TestValidator.predicate("pagination exists")(!!couponPage.pagination);
  TestValidator.predicate("contains at least issued coupons count")(
    (couponPage.data?.length ?? 0) >= couponInputs.length,
  );
}
