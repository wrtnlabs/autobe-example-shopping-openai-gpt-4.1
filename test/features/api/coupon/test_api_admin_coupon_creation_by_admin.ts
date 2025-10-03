import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Validate end-to-end coupon creation flow for an admin.
 *
 * Steps:
 *
 * 1. Register a new admin with random credentials.
 * 2. Create a new coupon campaign (with validated name, schedule, and status).
 * 3. Create a new coupon referencing the created campaign (unique code, business
 *    rules, usage/issuance caps, stack/exclusive logic, min/max, period,
 *    status).
 * 4. Validate all returned DTO fields and verify audit/snapshot fields.
 * 5. Attempt coupon creation with duplicate code (should fail for uniqueness).
 * 6. Attempt coupon creation as a non-admin and assert permission error.
 *
 * Coupon should assert correct linkage to campaign, correct status, and
 * validation of fields (type + business logic).
 */
export async function test_api_admin_coupon_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // Step 2: Create coupon campaign
  const campaignName = RandomGenerator.paragraph({ sentences: 2 });
  const campaignDescription = RandomGenerator.content({ paragraphs: 2 });
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const campaignBody = {
    name: campaignName,
    description: campaignDescription,
    starts_at: startsAt,
    ends_at: endsAt,
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);
  TestValidator.equals("campaign name matches", campaign.name, campaignName);

  // Step 3: Create coupon referencing campaign
  const couponCode = RandomGenerator.alphaNumeric(10);
  const couponBody = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: couponCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    coupon_type: "public",
    discount_type: "amount",
    discount_value: 1500,
    min_order_amount: 10000,
    max_discount_amount: 2000,
    stackable: true,
    exclusive: false,
    usage_limit_total: 1000,
    usage_limit_per_user: 2,
    issuance_limit_total: 1000,
    issued_at: startsAt,
    expires_at: endsAt,
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    { body: couponBody },
  );
  typia.assert(coupon);
  TestValidator.equals("coupon code matches", coupon.code, couponCode);
  TestValidator.equals(
    "coupon campaign linkage",
    coupon.shopping_mall_coupon_campaign_id,
    campaign.id,
  );
  TestValidator.equals("coupon status", coupon.business_status, "active");
  TestValidator.equals("issued count is zero", coupon.issued_count, 0);
  TestValidator.equals("used count is zero", coupon.used_count, 0);
  TestValidator.equals("stackable true", coupon.stackable, true);
  TestValidator.equals("exclusive false", coupon.exclusive, false);

  // Step 4: Attempt duplicate code
  await TestValidator.error(
    "creating coupon with duplicate code fails",
    async () => {
      await api.functional.shoppingMall.admin.coupons.create(connection, {
        body: { ...couponBody, code: couponCode },
      });
    },
  );

  // Step 5: Try coupon creation with unauthenticated (non-admin) account
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin cannot create coupon", async () => {
    await api.functional.shoppingMall.admin.coupons.create(unauthConn, {
      body: { ...couponBody, code: RandomGenerator.alphaNumeric(10) },
    });
  });
}
