import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";

export async function test_api_coupon_restriction_admin_create_success(
  connection: api.IConnection,
) {
  /**
   * Test end-to-end admin creation of a coupon restriction.
   *
   * This test validates that an admin can:
   *
   * 1. Join (register and authenticate) as a superuser,
   * 2. Create a new coupon policy with realistic rules,
   * 3. Add a new business restriction (product-specific/date-range)
   * 4. Assert correct linking between restriction and coupon,
   * 5. Confirm that restriction attributes and audit fields are set,
   * 6. Confirm business rule enforcement: duplicate restriction creation fails.
   */

  // 1. Admin registration and authentication
  const password = RandomGenerator.alphaNumeric(16); // Simulate pre-hashed password (for test only)
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@business-domain.com`;
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: password,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matches input",
    adminAuth.admin.username,
    adminUsername,
  );

  // 2. Create coupon as admin
  const couponCode = RandomGenerator.alphaNumeric(10);
  const nowIso = new Date().toISOString();
  const expiresIso = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: couponCode,
          type: "percentage",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 10,
          }),
          value: 20,
          min_order_amount: 10000,
          max_discount_amount: 50000,
          currency: "KRW",
          expires_at: expiresIso,
          stackable: false,
          personal: false,
          issued_quantity: 100,
          issued_per_user: 1,
          used_per_user: 1,
          usage_limit_total: 100,
          published_at: nowIso,
          status: "active",
          shopping_mall_ai_backend_channel_id: null,
          shopping_mall_ai_backend_seller_id: null,
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);
  TestValidator.equals("coupon code matches input", coupon.code, couponCode);
  TestValidator.equals("coupon type is percentage", coupon.type, "percentage");
  TestValidator.predicate("coupon issued count >= 0", coupon.issued_count >= 0);
  TestValidator.equals("coupon status active", coupon.status, "active");

  // 3. Admin creates a restriction with a date and product (simulate prod restriction logic)
  const restrictionStart = nowIso;
  const restrictionEnd = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 10,
  ).toISOString();
  const productId = typia.random<string & tags.Format<"uuid">>();
  const restrictionInput = {
    shopping_mall_ai_backend_coupon_id: coupon.id as string &
      tags.Format<"uuid">,
    shopping_mall_ai_backend_product_id: productId,
    start_time: restrictionStart,
    end_time: restrictionEnd,
    reason_code: RandomGenerator.alphaNumeric(8),
    shopping_mall_ai_backend_channel_section_id: null,
    shopping_mall_ai_backend_channel_category_id: null,
    shopping_mall_ai_backend_customer_id: null,
    weekday_bitmask: null,
    is_holiday_restricted: null,
  } satisfies IShoppingMallAiBackendCouponRestriction.ICreate;
  const restriction =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: restrictionInput,
      },
    );
  typia.assert(restriction);
  TestValidator.equals(
    "restriction is linked to coupon",
    restriction.shopping_mall_ai_backend_coupon_id,
    coupon.id as string & tags.Format<"uuid">,
  );
  TestValidator.equals(
    "restriction has product id set",
    restriction.shopping_mall_ai_backend_product_id,
    productId,
  );
  TestValidator.equals(
    "restriction starts at input",
    restriction.start_time,
    restrictionStart,
  );
  TestValidator.equals(
    "restriction ends at input",
    restriction.end_time,
    restrictionEnd,
  );
  TestValidator.predicate(
    "restriction created_at exists (iso date)",
    typeof restriction.created_at === "string" &&
      restriction.created_at.length > 0,
  );
  TestValidator.equals(
    "restriction created reason matches",
    restriction.reason_code,
    restrictionInput.reason_code,
  );

  // 4. Try to create the exact same restriction (business uniq logic)
  await TestValidator.error(
    "duplicate coupon restriction should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          body: restrictionInput,
        },
      );
    },
  );
}
