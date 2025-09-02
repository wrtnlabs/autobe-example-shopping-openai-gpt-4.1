import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

/**
 * Validate successful admin coupon update workflow.
 *
 * This test verifies that an authenticated admin can update mutable coupon
 * configuration fields such as value, type, expiry, stacking policy, and
 * limits, while immutable fields (id, code, created_at, etc.) remain
 * unchanged. It ensures that the update correctly applies only allowed
 * mutations, reflects them in the system, and increments version history
 * (via updated_at timestamp).
 *
 * The business workflow tested here is:
 *
 * 1. Register and authenticate an admin user
 * 2. Create a coupon policy with a known initial state (all fields set)
 * 3. Update a set of mutable coupon fields using PUT
 * 4. Validate that updated fields change, immutable ones do not, and
 *    versioning is respected
 * 5. Assert basic business logic invariants for counters and timestamps
 */
export async function test_api_admin_coupon_update_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const password = RandomGenerator.alphaNumeric(12);
  const adminCreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: password,
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(6)}@company.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(adminAuth);

  // 2. Create initial coupon policy
  const initialCouponInput = {
    code: RandomGenerator.alphaNumeric(10),
    type: RandomGenerator.pick(["fixed", "percentage", "shipping"] as const),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    value: 1000,
    min_order_amount: 5000,
    max_discount_amount: 950,
    currency: "KRW",
    expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    stackable: true,
    personal: false,
    issued_quantity: 1000,
    issued_per_user: 2,
    used_per_user: 1,
    usage_limit_total: 9999,
    published_at: new Date().toISOString(),
    status: "active",
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
  } satisfies IShoppingMallAiBackendCoupon.ICreate;
  const createdCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: initialCouponInput },
    );
  typia.assert(createdCoupon);

  // 3. Prepare an update for mutable coupon fields
  const updateData = {
    value: 2000,
    type: RandomGenerator.pick(["fixed", "percentage", "shipping"] as const),
    expires_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    max_discount_amount: 1990,
    stackable: false,
    personal: true,
    min_order_amount: 2000,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    issued_quantity: 2000,
    issued_per_user: 3,
    used_per_user: 2,
    usage_limit_total: 8888,
    published_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    status: "active",
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
    currency: "KRW",
  } satisfies IShoppingMallAiBackendCoupon.IUpdate;

  // 4. Update the coupon
  const updatedCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.update(
      connection,
      {
        couponId: createdCoupon.id as string & tags.Format<"uuid">,
        body: updateData,
      },
    );
  typia.assert(updatedCoupon);

  // 5. Verify updated_at is changed (versioning)
  TestValidator.notEquals(
    "updated_at timestamp must change",
    createdCoupon.updated_at,
    updatedCoupon.updated_at,
  );
  // Immutable fields remain the same
  TestValidator.equals(
    "coupon ID must remain the same",
    updatedCoupon.id,
    createdCoupon.id,
  );
  TestValidator.equals(
    "coupon code must remain the same",
    updatedCoupon.code,
    createdCoupon.code,
  );
  TestValidator.equals(
    "coupon created_at must not change",
    updatedCoupon.created_at,
    createdCoupon.created_at,
  );

  // Each mutable field should have updated value
  TestValidator.equals("value updated", updatedCoupon.value, updateData.value);
  TestValidator.equals("type updated", updatedCoupon.type, updateData.type);
  TestValidator.equals(
    "expires_at updated",
    updatedCoupon.expires_at,
    updateData.expires_at,
  );
  TestValidator.equals(
    "max_discount_amount updated",
    updatedCoupon.max_discount_amount,
    updateData.max_discount_amount,
  );
  TestValidator.equals(
    "stackable updated",
    updatedCoupon.stackable,
    updateData.stackable,
  );
  TestValidator.equals(
    "personal updated",
    updatedCoupon.personal,
    updateData.personal,
  );
  TestValidator.equals(
    "min_order_amount updated",
    updatedCoupon.min_order_amount,
    updateData.min_order_amount,
  );
  TestValidator.equals("title updated", updatedCoupon.title, updateData.title);
  TestValidator.equals(
    "description updated",
    updatedCoupon.description,
    updateData.description,
  );
  TestValidator.equals(
    "issued_quantity updated",
    updatedCoupon.issued_quantity,
    updateData.issued_quantity,
  );
  TestValidator.equals(
    "issued_per_user updated",
    updatedCoupon.issued_per_user,
    updateData.issued_per_user,
  );
  TestValidator.equals(
    "used_per_user updated",
    updatedCoupon.used_per_user,
    updateData.used_per_user,
  );
  TestValidator.equals(
    "usage_limit_total updated",
    updatedCoupon.usage_limit_total,
    updateData.usage_limit_total,
  );
  TestValidator.equals(
    "published_at updated",
    updatedCoupon.published_at,
    updateData.published_at,
  );
  TestValidator.equals(
    "status updated",
    updatedCoupon.status,
    updateData.status,
  );
  TestValidator.equals(
    "channel_id updated",
    updatedCoupon.shopping_mall_ai_backend_channel_id,
    updateData.shopping_mall_ai_backend_channel_id,
  );
  TestValidator.equals(
    "seller_id updated",
    updatedCoupon.shopping_mall_ai_backend_seller_id,
    updateData.shopping_mall_ai_backend_seller_id,
  );
  TestValidator.equals(
    "currency updated",
    updatedCoupon.currency,
    updateData.currency,
  );

  // Counters (system-managed): should not decrease
  TestValidator.predicate(
    "issued_count is not negative",
    typeof updatedCoupon.issued_count === "number" &&
      updatedCoupon.issued_count >= 0,
  );
  TestValidator.predicate(
    "used_count is not negative",
    typeof updatedCoupon.used_count === "number" &&
      updatedCoupon.used_count >= 0,
  );
}
