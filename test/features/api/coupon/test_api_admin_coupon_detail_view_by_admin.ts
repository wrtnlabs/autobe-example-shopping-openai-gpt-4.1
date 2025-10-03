import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";

/**
 * Test viewing coupon details as an admin.
 *
 * 1. Register a new admin using a random business email, secure password, and
 *    reasonable name.
 * 2. Create a coupon campaign as this admin with random campaign info—ensure
 *    unique name/description and active business status.
 * 3. Create a coupon using the campaign's ID. Populate all possible creation
 *    fields with realistic random and boundary values: code, title,
 *    description, coupon_type, discount_type, discount_value, min_order_amount,
 *    max_discount_amount, stackable, exclusive, usage_limit_total,
 *    usage_limit_per_user, issuance_limit_total, issued_at (now), expires_at
 *    (future), and business_status ('active').
 * 4. Fetch the coupon details with admin role and validate:
 *
 *    - All coupon fields match input or system-generated expectations.
 *    - Campaign ID in coupon matches the created campaign.
 *    - Stackable/exclusive flags logic is set correctly.
 *    - Usage and issuance limits are reflected as intended.
 *    - Audit and metadata fields: id is valid UUID, created_at/updated_at are
 *         present and date-time format, deleted_at is null.
 * 5. Attempt to fetch a non-existent couponId as admin—expect error.
 * 6. Attempt to fetch the coupon detail as an unauthenticated user—expect error.
 */
export async function test_api_admin_coupon_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Create a coupon campaign
  const campaignName = RandomGenerator.paragraph({ sentences: 2 });
  const campaignDescription = RandomGenerator.paragraph({ sentences: 5 });
  const now = new Date();
  const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: {
        name: campaignName,
        description: campaignDescription,
        starts_at: now.toISOString(),
        ends_at: inOneWeek.toISOString(),
        business_status: "active",
      } satisfies IShoppingMallCouponCampaign.ICreate,
    });
  typia.assert(campaign);

  // 3. Create a coupon linked to this campaign
  const couponCode = RandomGenerator.alphaNumeric(12);
  const couponTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 8,
  });
  const couponDescription = RandomGenerator.paragraph({ sentences: 8 });
  const expires_at = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const couponCreateBody = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: couponCode,
    title: couponTitle,
    description: couponDescription,
    coupon_type: "public",
    discount_type: "amount",
    discount_value: 5000,
    min_order_amount: 10000,
    max_discount_amount: 5000,
    stackable: true,
    exclusive: false,
    usage_limit_total: 200,
    usage_limit_per_user: 5,
    issuance_limit_total: 250,
    issued_at: now.toISOString(),
    expires_at,
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    {
      body: couponCreateBody,
    },
  );
  typia.assert(coupon);

  // 4. Fetch coupon details as admin and validate fields
  const detail = await api.functional.shoppingMall.admin.coupons.at(
    connection,
    {
      couponId: coupon.id,
    },
  );
  typia.assert(detail);
  // Validate all basic fields
  TestValidator.equals("coupon ID matches", detail.id, coupon.id);
  TestValidator.equals(
    "campaign ID matches",
    detail.shopping_mall_coupon_campaign_id,
    campaign.id,
  );
  TestValidator.equals(
    "coupon code matches",
    detail.code,
    couponCreateBody.code,
  );
  TestValidator.equals(
    "coupon title matches",
    detail.title,
    couponCreateBody.title,
  );
  TestValidator.equals(
    "coupon description matches",
    detail.description,
    couponCreateBody.description,
  );
  TestValidator.equals(
    "coupon type matches",
    detail.coupon_type,
    couponCreateBody.coupon_type,
  );
  TestValidator.equals(
    "discount type matches",
    detail.discount_type,
    couponCreateBody.discount_type,
  );
  TestValidator.equals(
    "discount value matches",
    detail.discount_value,
    couponCreateBody.discount_value,
  );
  TestValidator.equals(
    "min order amount matches",
    detail.min_order_amount,
    couponCreateBody.min_order_amount,
  );
  TestValidator.equals(
    "max discount amount matches",
    detail.max_discount_amount,
    couponCreateBody.max_discount_amount,
  );
  TestValidator.equals(
    "stackable flag matches",
    detail.stackable,
    couponCreateBody.stackable,
  );
  TestValidator.equals(
    "exclusive flag matches",
    detail.exclusive,
    couponCreateBody.exclusive,
  );
  TestValidator.equals(
    "usage_limit_total matches",
    detail.usage_limit_total,
    couponCreateBody.usage_limit_total,
  );
  TestValidator.equals(
    "usage_limit_per_user matches",
    detail.usage_limit_per_user,
    couponCreateBody.usage_limit_per_user,
  );
  TestValidator.equals(
    "issuance_limit_total matches",
    detail.issuance_limit_total,
    couponCreateBody.issuance_limit_total,
  );
  TestValidator.equals(
    "issued_at matches",
    detail.issued_at,
    couponCreateBody.issued_at,
  );
  TestValidator.equals(
    "expires_at matches",
    detail.expires_at,
    couponCreateBody.expires_at,
  );
  TestValidator.equals(
    "business_status matches",
    detail.business_status,
    couponCreateBody.business_status,
  );
  // Audit/meta fields
  TestValidator.predicate(
    "coupon id format is uuid",
    typeof detail.id === "string" && /[0-9a-f-]{36}/i.test(detail.id),
  );
  TestValidator.predicate("created_at present", !!detail.created_at);
  TestValidator.predicate("updated_at present", !!detail.updated_at);
  TestValidator.equals("deleted_at is null", detail.deleted_at, null);

  // 5. Attempt to fetch non-existent couponId as admin (should fail)
  await TestValidator.error(
    "fetching non-existent couponId as admin should fail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.at(connection, {
        couponId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Attempt to fetch the coupon detail as unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot fetch coupon detail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.at(unauthConn, {
        couponId: coupon.id,
      });
    },
  );
}
