import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate seller-driven coupon creation and related business rules.
 *
 * This test covers end-to-end seller coupon creation: registering a seller,
 * creating a campaign, issuing a seller coupon referencing the campaign,
 * enforcing coupon code uniqueness, verifying stackable/exclusive logic, and
 * permission restriction (seller-only endpoint).
 *
 * Steps:
 *
 * 1. Register a new seller and authenticate.
 * 2. As admin, create a coupon campaign.
 * 3. As seller, create a coupon referencing the campaign, with randomized code and
 *    logical stack/exclusive settings.
 * 4. Attempt to re-create a coupon with the same code and expect an error
 *    (uniqueness enforced).
 * 5. Assert all coupon business rule fields are correct in the response.
 * 6. Try to create a coupon as a non-seller (simulate customer/guest) and expect a
 *    permission denied error.
 */
export async function test_api_seller_coupon_creation_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "pass-" + RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    shopping_mall_channel_id: channelId,
    shopping_mall_section_id: sectionId,
    profile_name: RandomGenerator.name(2),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // 2. As admin, create a coupon campaign
  const campaignBody = {
    name: "Campaign-" + RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph(),
    starts_at: new Date().toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignBody,
    });
  typia.assert(campaign);
  // 3. Seller creates coupon referencing the campaign
  const couponCode = "SELLER-" + RandomGenerator.alphaNumeric(10);
  const couponBody = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: couponCode,
    title: "10% Discount",
    description: "Seller exclusive 10% off coupon for special campaign.",
    coupon_type: "seller",
    discount_type: "percentage",
    discount_value: 10,
    min_order_amount: 10000,
    max_discount_amount: 50000,
    stackable: false,
    exclusive: true,
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    issuance_limit_total: 100,
    issued_at: new Date().toISOString(),
    expires_at: campaign.ends_at,
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const createdCoupon = await api.functional.shoppingMall.seller.coupons.create(
    connection,
    {
      body: couponBody,
    },
  );
  typia.assert(createdCoupon);
  TestValidator.equals("coupon code matches", createdCoupon.code, couponCode);
  TestValidator.equals(
    "coupon stackable",
    createdCoupon.stackable,
    couponBody.stackable,
  );
  TestValidator.equals(
    "coupon exclusive",
    createdCoupon.exclusive,
    couponBody.exclusive,
  );
  TestValidator.equals(
    "coupon campaign id",
    createdCoupon.shopping_mall_coupon_campaign_id,
    campaign.id,
  );
  // 4. Duplicate coupon code enforcement
  await TestValidator.error("duplicate coupon code should fail", async () => {
    await api.functional.shoppingMall.seller.coupons.create(connection, {
      body: { ...couponBody },
    });
  });
  // 5. Try to create a coupon as a non-seller (simulate fresh unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-seller cannot create coupon", async () => {
    await api.functional.shoppingMall.seller.coupons.create(unauthConn, {
      body: { ...couponBody, code: couponCode + "B" },
    });
  });
}
