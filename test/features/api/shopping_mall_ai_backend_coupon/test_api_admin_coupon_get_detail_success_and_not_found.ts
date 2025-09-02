import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

export async function test_api_admin_coupon_get_detail_success_and_not_found(
  connection: api.IConnection,
) {
  /**
   * 1. Create and authenticate an admin
   * 2. Create a coupon as that admin
   * 3. Retrieve details about the coupon and validate response
   * 4. Attempt to retrieve a non-existent coupon and expect an error
   */
  // Step 1: admin join/login to establish auth context
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const adminName = RandomGenerator.name();
  const adminPasswordHash = RandomGenerator.alphaNumeric(32); // Simulates a hashed password
  const adminPayload = {
    username: adminUsername,
    password_hash: adminPasswordHash,
    name: adminName,
    email: adminEmail,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminPayload,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin is active",
    adminAuth.admin.is_active === true,
  );

  // Step 2: create coupon as admin
  const couponCode = RandomGenerator.alphaNumeric(10).toUpperCase();
  const couponPayload = {
    code: couponCode,
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 4,
      sentenceMax: 8,
    }),
    value: 15000,
    min_order_amount: 30000,
    max_discount_amount: null,
    currency: "KRW",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    stackable: true,
    personal: false,
    issued_quantity: 500,
    issued_per_user: 2,
    used_per_user: 2,
    usage_limit_total: 800,
    published_at: new Date().toISOString(),
    status: "active",
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
  } satisfies IShoppingMallAiBackendCoupon.ICreate;

  const createdCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponPayload },
    );
  typia.assert(createdCoupon);
  TestValidator.equals(
    "coupon code matches input",
    createdCoupon.code,
    couponPayload.code,
  );
  TestValidator.equals(
    "coupon title matches input",
    createdCoupon.title,
    couponPayload.title,
  );
  TestValidator.equals(
    "coupon status is 'active'",
    createdCoupon.status,
    "active",
  );
  TestValidator.predicate(
    "coupon created_at exists",
    typeof createdCoupon.created_at === "string" &&
      createdCoupon.created_at.length > 0,
  );
  TestValidator.predicate(
    "coupon updated_at exists",
    typeof createdCoupon.updated_at === "string" &&
      createdCoupon.updated_at.length > 0,
  );
  TestValidator.equals(
    "coupon deleted_at is null (not deleted)",
    createdCoupon.deleted_at,
    null,
  );

  // Step 3: fetch the coupon details and validate meta/audit fields
  const couponDetail =
    await api.functional.shoppingMallAiBackend.admin.coupons.at(connection, {
      couponId: createdCoupon.id as string & tags.Format<"uuid">,
    });
  typia.assert(couponDetail);
  TestValidator.equals(
    "fetched coupon id matches",
    couponDetail.id,
    createdCoupon.id,
  );
  TestValidator.equals(
    "fetched coupon code matches",
    couponDetail.code,
    couponPayload.code,
  );
  TestValidator.equals(
    "fetched coupon title matches",
    couponDetail.title,
    couponPayload.title,
  );
  TestValidator.equals(
    "fetched coupon status is 'active'",
    couponDetail.status,
    "active",
  );
  TestValidator.predicate(
    "fetched coupon created_at is present",
    typeof couponDetail.created_at === "string" &&
      couponDetail.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched coupon updated_at is present",
    typeof couponDetail.updated_at === "string" &&
      couponDetail.updated_at.length > 0,
  );
  TestValidator.equals(
    "fetched coupon deleted_at is null (not deleted)",
    couponDetail.deleted_at,
    null,
  );

  // Step 4: try fetch with non-existent couponId
  const nonExistentCouponId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetching non-existent couponId should result in error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.at(connection, {
        couponId: nonExistentCouponId,
      });
    },
  );
}
