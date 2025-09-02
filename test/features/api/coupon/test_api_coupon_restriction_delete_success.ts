import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";

export async function test_api_coupon_restriction_delete_success(
  connection: api.IConnection,
) {
  /**
   * Test the permanent deletion of a coupon restriction by an admin.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin via /auth/admin/join
   * 2. Create a new coupon with admin privileges
   * 3. Add a restriction to that coupon
   * 4. Delete the created coupon restriction
   * 5. Assert that the restriction is no longer accessible after deletion,
   *    enforcing integrity of the operation.
   *
   * Verifies proper compliance, audit, and business logic enforcement for
   * coupon restriction management. If a restriction listing/read operation was
   * available, it would be preferable for E2E verification; here, deletion is
   * confirmed by attempting a second delete (which must error).
   */

  // 1. Register and authenticate as admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@test.example.com`,
    phone_number: null,
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin join grants access token",
    !!connection.headers?.Authorization,
  );

  // 2. Create a coupon
  const couponInput: IShoppingMallAiBackendCoupon.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick(["fixed", "percentage", "shipping"]) as string,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    value: 1000,
    min_order_amount: 5000,
    max_discount_amount: null,
    currency: "KRW",
    expires_at: null,
    stackable: true,
    personal: false,
    issued_quantity: null,
    issued_per_user: null,
    used_per_user: null,
    usage_limit_total: null,
    published_at: null,
    status: "active",
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
  };
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: couponInput,
      },
    );
  typia.assert(coupon);

  // 3. Add a restriction to the coupon
  const restrictionInput: IShoppingMallAiBackendCouponRestriction.ICreate = {
    shopping_mall_ai_backend_coupon_id: coupon.id as string &
      tags.Format<"uuid">,
    start_time: null,
    end_time: null,
    weekday_bitmask: null,
    is_holiday_restricted: null,
    reason_code: null,
    shopping_mall_ai_backend_product_id: null,
    shopping_mall_ai_backend_channel_section_id: null,
    shopping_mall_ai_backend_channel_category_id: null,
    shopping_mall_ai_backend_customer_id: null,
  };
  const restriction =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
      connection,
      {
        couponId: typia.assert(coupon.id) as string & tags.Format<"uuid">,
        body: restrictionInput,
      },
    );
  typia.assert(restriction);

  // 4. Delete the created restriction
  await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.erase(
    connection,
    {
      couponId: restriction.shopping_mall_ai_backend_coupon_id,
      restrictionId: restriction.id,
    },
  );

  // 5. Check that the restriction is gone (simulate index/list operation by attempting to delete again and expecting error)
  await TestValidator.error(
    "deleting non-existent coupon restriction returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.erase(
        connection,
        {
          couponId: restriction.shopping_mall_ai_backend_coupon_id,
          restrictionId: restriction.id,
        },
      );
    },
  );
}
