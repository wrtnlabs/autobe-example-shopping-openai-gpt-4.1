import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";

export async function test_api_coupon_stacking_rule_detail_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful, authorized retrieval of a coupon stacking rule (admin
   * role).
   *
   * Steps:
   *
   * 1. Register an admin account and acquire authentication token for all
   *    following operations (admin join).
   * 2. Create a new coupon as the admin.
   * 3. Create a stacking rule for the coupon as the admin.
   * 4. Retrieve stacking rule details by couponId and stackingRuleId.
   * 5. Validate that the stacking rule structure includes all expected business
   *    and configuration fields.
   */

  // 1. Register/admin join (establish admin context)
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      password_hash: RandomGenerator.alphaNumeric(20),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create coupon under admin role
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          type: RandomGenerator.pick([
            "fixed",
            "percentage",
            "shipping",
            "event",
          ] as const),
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          value: 1000,
          min_order_amount: 10000,
          max_discount_amount: 3000,
          currency: "KRW",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // 30 days ahead
          stackable: true,
          personal: false,
          issued_quantity: 1000,
          issued_per_user: 1,
          used_per_user: 1,
          usage_limit_total: 1000,
          published_at: new Date().toISOString(),
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Create stacking rule for coupon
  const stackingRule =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.create(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {
          type: RandomGenerator.pick(["allow", "deny", "override"] as const),
          applies_to_type: coupon.type,
        } satisfies IShoppingMallAiBackendCouponStackingRule.ICreate,
      },
    );
  typia.assert(stackingRule);

  // 4. Retrieve stacking rule detail
  const result =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.at(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        stackingRuleId: stackingRule.id as string & tags.Format<"uuid">,
      },
    );
  typia.assert(result);

  // 5. Validate stacking rule business/configuration fields
  TestValidator.equals(
    "returned stackingRule.id matches",
    result.id,
    stackingRule.id,
  );
  TestValidator.equals(
    "coupon_id matches",
    result.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );
  TestValidator.equals("type matches", result.type, stackingRule.type);
  TestValidator.equals(
    "applies_to_type matches",
    result.applies_to_type,
    stackingRule.applies_to_type,
  );
  TestValidator.predicate(
    "excluded_coupon_id present (nullable, always defined)",
    Object.prototype.hasOwnProperty.call(result, "excluded_coupon_id"),
  );
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof result.created_at === "string" && result.created_at.length > 0,
  );
}
