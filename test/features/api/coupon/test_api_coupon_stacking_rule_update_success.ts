import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";

export async function test_api_coupon_stacking_rule_update_success(
  connection: api.IConnection,
) {
  /**
   * Test updating a stacking rule for a coupon (admin role, success path).
   *
   * 1. Register an admin to obtain role context and authentication.
   * 2. Create a coupon to attach the stacking rule to.
   * 3. Create an initial stacking rule for the coupon.
   * 4. Update the stacking rule's properties (e.g., 'type', 'applies_to_type', or
   *    'excluded_coupon_id').
   * 5. Validate that the returned stacking rule object reflects the updated fields
   *    and remains assigned to the same coupon/stackingRuleId.
   */

  // 1. Register admin
  const adminJoinInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@test-coupon.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);

  // 2. Create coupon
  const couponInput = {
    code: RandomGenerator.alphaNumeric(8),
    type: RandomGenerator.pick([
      "fixed",
      "percentage",
      "shipping",
      "event",
    ] as const),
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 15,
    }),
    value: 10000,
    min_order_amount: 50000,
    max_discount_amount: 3000,
    currency: "KRW",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    stackable: true,
    personal: false,
    issued_quantity: 10000,
    issued_per_user: 3,
    used_per_user: 3,
    usage_limit_total: 5000,
    published_at: new Date().toISOString(),
    status: "active",
  } satisfies IShoppingMallAiBackendCoupon.ICreate;
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponInput },
    );
  typia.assert(coupon);

  // 3. Create stacking rule
  const stackingRuleCreateInput = {
    shopping_mall_ai_backend_coupon_id: coupon.id as string &
      tags.Format<"uuid">,
    type: RandomGenerator.pick(["allow", "deny", "override"] as const),
    applies_to_type: RandomGenerator.pick([
      "fixed",
      "percentage",
      null,
    ] as const),
    excluded_coupon_id: null,
  } satisfies IShoppingMallAiBackendCouponStackingRule.ICreate;
  const stackingRule =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.create(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: stackingRuleCreateInput,
      },
    );
  typia.assert(stackingRule);

  // 4. Update stacking rule (change type and applies_to_type, set excluded_coupon_id)
  const stackingRuleUpdateInput = {
    type: stackingRule.type === "allow" ? "deny" : "allow",
    applies_to_type:
      stackingRule.applies_to_type === "fixed" ? "percentage" : "fixed",
    excluded_coupon_id: null,
  } satisfies IShoppingMallAiBackendCouponStackingRule.IUpdate;
  const updatedStackingRule =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.update(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        stackingRuleId: stackingRule.id,
        body: stackingRuleUpdateInput,
      },
    );
  typia.assert(updatedStackingRule);

  // 5. Validate updated stacking rule properties
  TestValidator.equals(
    "updated stacking rule ID matches original",
    updatedStackingRule.id,
    stackingRule.id,
  );
  TestValidator.equals(
    "updated stacking rule coupon matches coupon",
    updatedStackingRule.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );
  TestValidator.notEquals(
    "stacking rule type is changed",
    updatedStackingRule.type,
    stackingRule.type,
  );
  TestValidator.equals(
    "applies_to_type updated as requested",
    updatedStackingRule.applies_to_type,
    stackingRuleUpdateInput.applies_to_type,
  );
  TestValidator.equals(
    "excluded_coupon_id remains null",
    updatedStackingRule.excluded_coupon_id,
    null,
  );
}
