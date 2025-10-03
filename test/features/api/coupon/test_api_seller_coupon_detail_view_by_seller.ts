import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Simulates seller viewing their coupon's full detail including validation of
 * field values and permissions. Steps:
 *
 * 1. Register as a new seller using IShoppingMallSeller.IJoin (random
 *    channel/section IDs)
 * 2. Create a coupon campaign as admin (IShoppingMallCouponCampaign.ICreate)
 * 3. Create a coupon as the seller linked to above campaign
 *    (IShoppingMallCoupon.ICreate)
 * 4. Fetch the coupon using GET /shoppingMall/seller/coupons/{couponId} and
 *    compare all coupon fields.
 * 5. Negative test: attempt to fetch coupon with random UUID as seller and expect
 *    error.
 */
export async function test_api_seller_coupon_detail_view_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "1234",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  TestValidator.equals(
    "seller email matches",
    sellerAuth.seller?.id,
    sellerAuth.id,
  );

  // 2. Create coupon campaign as admin (simulate admin session or reuse seller session for test)
  const campaignBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);

  // 3. Create a coupon as the seller referencing the campaign
  const couponCode = RandomGenerator.alphaNumeric(12);
  const couponBody = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: couponCode,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    coupon_type: "seller", // business value, valid for seller coupons
    discount_type: RandomGenerator.pick(["amount", "percentage"] as const),
    discount_value: 5000,
    min_order_amount: 10000,
    max_discount_amount: 5000,
    stackable: true,
    exclusive: false,
    usage_limit_total: 100,
    usage_limit_per_user: 2,
    issuance_limit_total: 100,
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.seller.coupons.create(
    connection,
    { body: couponBody },
  );
  typia.assert(coupon);

  // 4. Retrieve coupon as seller
  const detail = await api.functional.shoppingMall.seller.coupons.at(
    connection,
    { couponId: coupon.id },
  );
  typia.assert(detail);
  TestValidator.equals(
    "coupon detail id matches created",
    detail.id,
    coupon.id,
  );
  TestValidator.equals("coupon detail code matches", detail.code, couponCode);
  TestValidator.equals(
    "coupon detail title matches",
    detail.title,
    couponBody.title,
  );
  TestValidator.equals(
    "coupon detail discount type matches",
    detail.discount_type,
    couponBody.discount_type,
  );
  TestValidator.equals(
    "coupon detail value matches",
    detail.discount_value,
    couponBody.discount_value,
  );
  TestValidator.equals(
    "coupon campaign link matches",
    detail.shopping_mall_coupon_campaign_id,
    campaign.id,
  );
  TestValidator.equals(
    "coupon detail min order",
    detail.min_order_amount,
    couponBody.min_order_amount,
  );
  TestValidator.equals(
    "coupon detail stackable",
    detail.stackable,
    couponBody.stackable,
  );
  TestValidator.equals(
    "coupon detail exclusive",
    detail.exclusive,
    couponBody.exclusive,
  );
  TestValidator.equals(
    "coupon detail business status",
    detail.business_status,
    couponBody.business_status,
  );

  // 5. Negative test: Non-existent coupon as seller
  await TestValidator.error(
    "non-existent coupon retrieve as seller should fail",
    async () => {
      await api.functional.shoppingMall.seller.coupons.at(connection, {
        couponId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
