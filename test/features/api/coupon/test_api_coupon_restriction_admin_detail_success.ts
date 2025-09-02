import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";

/**
 * Validate that an admin can retrieve the details of a specific coupon
 * restriction.
 *
 * This E2E test covers the end-to-end workflow:
 *
 * 1. Register/join an admin account, ensuring proper authentication
 * 2. Create a coupon by the admin
 * 3. Add a restriction to the created coupon
 * 4. Retrieve the created restriction's details by coupon and restriction ID
 * 5. Validate linkage and all business-critical fields, ensuring admin-only
 *    access
 *
 * This test confirms that restriction detail retrieval is strictly
 * controlled, that created data is faithfully returned, and that type
 * integrity is enforced at every step. Negative/error cases are omitted
 * unless the SDK/contract allows type-safe negative-path testing.
 */
export async function test_api_coupon_restriction_admin_detail_success(
  connection: api.IConnection,
) {
  // 1. Register (join) a new admin and authenticate
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create a coupon with realistic details
  const couponInput = {
    code: RandomGenerator.alphaNumeric(10),
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    value: 10000,
    min_order_amount: 5000,
    max_discount_amount: 20000,
    currency: "KRW",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    stackable: false,
    personal: false,
    issued_quantity: 1000,
    issued_per_user: 2,
    used_per_user: 2,
    usage_limit_total: 2000,
    published_at: new Date().toISOString(),
    status: "active",
  } satisfies IShoppingMallAiBackendCoupon.ICreate;
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: couponInput,
      },
    );
  typia.assert(coupon);

  // 3. Add a restriction to the coupon
  const restrictionInput = {
    shopping_mall_ai_backend_coupon_id: coupon.id,
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(),
    weekday_bitmask: 0b0111110, // Restriction applies Monday to Friday
    is_holiday_restricted: false,
    reason_code: "product_cat_limit",
  } satisfies IShoppingMallAiBackendCouponRestriction.ICreate;
  const restriction =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
      connection,
      {
        couponId: coupon.id,
        body: restrictionInput,
      },
    );
  typia.assert(restriction);

  // 4. Retrieve the restriction details
  const fetched =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.at(
      connection,
      {
        couponId: coupon.id,
        restrictionId: restriction.id,
      },
    );
  typia.assert(fetched);

  // 5. Validate all business-critical and linkage fields
  TestValidator.equals("restriction id matches", fetched.id, restriction.id);
  TestValidator.equals(
    "coupon linkage correct",
    fetched.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );
  TestValidator.equals(
    "start time matches",
    fetched.start_time,
    restrictionInput.start_time,
  );
  TestValidator.equals(
    "end time matches",
    fetched.end_time,
    restrictionInput.end_time,
  );
  TestValidator.equals(
    "reason code",
    fetched.reason_code,
    restrictionInput.reason_code,
  );
  TestValidator.equals(
    "weekday bitmask",
    fetched.weekday_bitmask,
    restrictionInput.weekday_bitmask,
  );
  TestValidator.equals(
    "holiday restriction",
    fetched.is_holiday_restricted,
    restrictionInput.is_holiday_restricted,
  );
  // If relevant, also check optional link fields and nullability handling (not covered here for brevity)
}
