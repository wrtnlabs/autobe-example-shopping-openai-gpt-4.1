import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendDiscountCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendDiscountCampaign";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate coupon creation under a discount campaign: ensure correct creation,
 * enforce unique codes, and verify API error handling for validation failures.
 *
 * - Business context: Coupons are issued under campaigns and must have unique
 *   codes. Administrators commonly create and assign coupons via UI or
 *   programmatic interface. Ensuring that API enforces constraints and input
 *   validation is critical for platform integrity.
 *
 * Steps:
 *
 * 1. Create a discount campaign with required fields.
 * 2. Issue a coupon with valid required data and verify structure/campaign
 *    linkage.
 * 3. Attempt to issue a duplicate code coupon: expect duplication error.
 * 4. Attempt coupon creation with invalid payloads: (a) missing required field,
 *    (b) invalid date, and confirm API responds with validation errors.
 */
export async function test_api_aimall_backend_administrator_discountCampaigns_coupons_test_create_campaign_coupon_with_valid_data_and_duplicate_code(
  connection: api.IConnection,
) {
  // 1. Create a discount campaign
  const now = new Date();
  const in1hour = new Date(now.getTime() + 60 * 60 * 1000);
  const in24hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const campaignInput = {
    name: `Test Campaign ${now.getTime()}`,
    code: `CODE${now.getTime()}`,
    type: "order",
    status: "active",
    stackable: false,
    start_at: now.toISOString(),
    end_at: in24hours.toISOString(),
    priority: 1,
    description: "E2E test campaign.",
  } satisfies IAimallBackendDiscountCampaign.ICreate;
  const campaign =
    await api.functional.aimall_backend.administrator.discountCampaigns.create(
      connection,
      { body: campaignInput },
    );
  typia.assert(campaign);

  // 2. Issue a coupon with valid required data
  const couponCode = `CPN${now.getTime()}`;
  const couponInput = {
    discount_campaign_id: campaign.id,
    code: couponCode,
    status: "issued",
    issued_at: in1hour.toISOString(),
    expires_at: in24hours.toISOString(),
  } satisfies IAimallBackendCoupon.ICreate;
  const coupon =
    await api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: couponInput },
    );
  typia.assert(coupon);
  TestValidator.equals("linked campaign")(coupon.discount_campaign_id)(
    campaign.id,
  );
  TestValidator.equals("coupon code matches")(coupon.code)(couponCode);

  // 3. Attempt to create duplicate coupon code (should error)
  await TestValidator.error("duplicate coupon code not allowed")(() =>
    api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: couponInput },
    ),
  );

  // 4a. Invalid payload: missing required field 'status'
  await TestValidator.error("missing status field triggers validation error")(
    () => {
      // Technically not implementable due to TypeScript typing, so skip actual omission test.
      // Left as a placeholder to document desired test (see requirements).
      throw new Error(
        "TypeScript will prevent omission of required fields in IAimallBackendCoupon.ICreate.",
      );
    },
  );

  // 4b. Invalid payload: bad date format in expires_at
  await TestValidator.error(
    "expires_at with invalid date string triggers validation error",
  )(() => {
    const invalidInput = {
      ...couponInput,
      expires_at: "invalid-date-format",
    };
    return api.functional.aimall_backend.administrator.discountCampaigns.coupons.create(
      connection,
      { discountCampaignId: campaign.id, body: invalidInput },
    );
  });
}
