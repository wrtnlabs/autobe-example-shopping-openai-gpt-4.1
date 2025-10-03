import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoupon";
import type { IShoppingMallCouponCampaign } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponCampaign";
import type { IShoppingMallCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCouponIssuance";

/**
 * Test admin retrieval of coupon issuance detail (by couponId & issuanceId).
 *
 * 1. Register as a new admin and login; acquire session/token.
 * 2. Create a coupon campaign to allow campaign linkage.
 * 3. Create a coupon under the campaign with business logic-compliant data.
 * 4. Issue a coupon (public/generic, not tied to customer) to create test record.
 * 5. Retrieve the issuance by couponId and issuanceId as admin; validate all
 *    fields match creation and business expectations (coupon linkage, status,
 *    usage, expirations, meta, customer field allowed).
 * 6. Negative case: request with wrong (random) issuanceId or couponId; expect 404
 *    error (not found).
 * 7. (Business logic only allows admin access) Negative case: simulate
 *    unauthenticated access (empty headers); expect error or redirect/denial as
 *    per platform logic.
 */
export async function test_api_coupon_issuance_detail_retrieval_admin(
  connection: api.IConnection,
) {
  // Register new admin, perform login and get session
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "securepass123",
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // At this stage, admin connection uses the returned access token automatically

  // Create a coupon campaign for linkage context
  const campaignCreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    ends_at: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), // 2 days later
    business_status: "active",
  } satisfies IShoppingMallCouponCampaign.ICreate;
  const campaign =
    await api.functional.shoppingMall.admin.couponCampaigns.create(connection, {
      body: campaignCreate,
    });
  typia.assert(campaign);

  // Create a coupon under the campaign
  const couponCreate = {
    shopping_mall_coupon_campaign_id: campaign.id,
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    coupon_type: "public",
    discount_type: "amount",
    discount_value: 5000,
    min_order_amount: 10000,
    max_discount_amount: 5000,
    stackable: true,
    exclusive: false,
    usage_limit_total: 100,
    usage_limit_per_user: 1,
    issuance_limit_total: 200,
    issued_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 1 day later
    business_status: "active",
  } satisfies IShoppingMallCoupon.ICreate;
  const coupon = await api.functional.shoppingMall.admin.coupons.create(
    connection,
    { body: couponCreate },
  );
  typia.assert(coupon);

  // Create a coupon issuance (unassigned to customer, public)
  const issuanceCreate = {
    shopping_mall_coupon_id: coupon.id,
    code: RandomGenerator.alphaNumeric(12),
    issued_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 mins ago
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(), // 20 hours later
    usage_limit: 1,
  } satisfies IShoppingMallCouponIssuance.ICreate;
  const issuance =
    await api.functional.shoppingMall.admin.coupons.issuances.create(
      connection,
      {
        couponId: coupon.id,
        body: issuanceCreate,
      },
    );
  typia.assert(issuance);

  // Retrieve issuance detail as admin
  const detail = await api.functional.shoppingMall.admin.coupons.issuances.at(
    connection,
    {
      couponId: coupon.id,
      issuanceId: issuance.id,
    },
  );
  typia.assert(detail);
  // Check all business properties
  TestValidator.equals("issuance id matches", detail.id, issuance.id);
  TestValidator.equals(
    "coupon linkage matches",
    detail.shopping_mall_coupon_id,
    coupon.id,
  );
  TestValidator.equals("code matches", detail.code, issuance.code);
  TestValidator.equals(
    "issued_at matches",
    detail.issued_at,
    issuance.issued_at,
  );
  TestValidator.equals(
    "expires_at matches",
    detail.expires_at,
    issuance.expires_at,
  );
  TestValidator.equals(
    "usage_limit matches",
    detail.usage_limit,
    issuance.usage_limit,
  );
  TestValidator.equals(
    "used_count is zero post-creation",
    detail.used_count,
    0,
  );
  TestValidator.equals("status is active on creation", detail.status, "active");
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(detail.created_at) <= new Date(detail.updated_at),
  );
  TestValidator.equals(
    "deleted_at is null/undefined for active",
    detail.deleted_at ?? null,
    null,
  );
  TestValidator.equals(
    "unassigned issuance has no customer linkage",
    detail.shopping_mall_customer_id ?? null,
    null,
  );

  // Negative: wrong issuanceId
  await TestValidator.error(
    "non-existent issuanceId returns not found",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.at(connection, {
        couponId: coupon.id,
        issuanceId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Negative: wrong couponId
  await TestValidator.error(
    "non-existent couponId returns not found",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.at(connection, {
        couponId: typia.random<string & tags.Format<"uuid">>(),
        issuanceId: issuance.id,
      });
    },
  );

  // Negative: unauthenticated connection (admin required)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin cannot retrieve issuance detail",
    async () => {
      await api.functional.shoppingMall.admin.coupons.issuances.at(unauthConn, {
        couponId: coupon.id,
        issuanceId: issuance.id,
      });
    },
  );
}
