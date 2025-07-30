import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IPageIAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendDiscountCampaign";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";

/**
 * Test creation of a new coupon voucher by an administrator with a unique code
 * and valid campaign association.
 *
 * Validates that an administrator can successfully create a coupon using a
 * unique code and a real discount campaign. Ensures required fields are
 * honored—association, unique code, issuance/expiry, and initial status. Also
 * verifies that code uniqueness is enforced (duplicate creation fails).
 *
 * Test Flow:
 *
 * 1. Fetch discount campaigns visible to the administrator
 * 2. Choose an active/available campaign for test association
 * 3. Generate a unique coupon code and set issued/expiry datetimes
 * 4. Submit coupon creation request via API
 * 5. Assert response fields: campaign link, code, status, timestamps, and redeemed
 *    state
 * 6. Attempt duplicate creation—expect business error due to code uniqueness
 */
export async function test_api_coupons_test_create_coupon_success_unique_code(
  connection: api.IConnection,
) {
  // 1. Fetch discount campaigns
  const campaignsPage =
    await api.functional.aimall_backend.administrator.discountCampaigns.index(
      connection,
    );
  typia.assert(campaignsPage);

  // 2. Pick an active campaign or any available
  const campaign =
    campaignsPage.data.find((c) => c.status === "active") ??
    campaignsPage.data[0];
  if (!campaign)
    throw new Error("No discount campaigns available for coupon creation test");

  // 3. Generate unique coupon code and set times
  const uniqueCode = `UNIQUE-${RandomGenerator.alphaNumeric(8)}`;
  const now = new Date();
  const issued_at = now.toISOString();
  const expires_at = new Date(now.getTime() + 24 * 3600 * 1000).toISOString(); // +1 day
  const couponCreate = {
    discount_campaign_id: campaign.id,
    code: uniqueCode,
    status: "issued",
    issued_at,
    expires_at,
  } satisfies IAimallBackendCoupon.ICreate;

  // 4. Submit coupon create API
  const created =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: couponCreate },
    );
  typia.assert(created);

  // 5. Validate returned coupon
  TestValidator.equals("campaign association")(created.discount_campaign_id)(
    couponCreate.discount_campaign_id,
  );
  TestValidator.equals("coupon code")(created.code)(couponCreate.code);
  TestValidator.equals("status")(created.status)("issued");
  TestValidator.equals("issued_at")(created.issued_at)(couponCreate.issued_at);
  TestValidator.equals("expires_at")(created.expires_at)(
    couponCreate.expires_at,
  );
  TestValidator.equals("unredeemed")(created.redeemed_at)(null);

  // 6. Attempt duplicate code (code uniqueness)
  await TestValidator.error("duplicate code not allowed")(async () => {
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: couponCreate },
    );
  });
}
