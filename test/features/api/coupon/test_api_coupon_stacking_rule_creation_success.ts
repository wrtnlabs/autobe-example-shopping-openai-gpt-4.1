import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";

/**
 * Test creation of a new coupon stacking rule by admin.
 *
 * This function validates that an admin can register a coupon stacking rule
 * forbidding stacking between two distinct coupons. It performs the
 * following steps:
 *
 * 1. Join as an admin (authentication/authorization).
 * 2. Create the first coupon (primary stacking subject).
 * 3. Create the second coupon (to be used as exclusion in stacking rule).
 * 4. Add a stacking rule specifying that coupon1 cannot be stacked with
 *    coupon2.
 * 5. Assert that the stacking rule is persisted with correct matching
 *    properties (coupon id, excluded id, type, applies_to_type) and shape.
 */
export async function test_api_coupon_stacking_rule_creation_success(
  connection: api.IConnection,
) {
  // 1. Create admin and authenticate
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphabets(8)}@biz-example.com`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create first coupon (primary for stacking rule)
  const coupon1Code = `STACKRULE${RandomGenerator.alphaNumeric(6)}`;
  const coupon1 =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: coupon1Code,
          type: "fixed",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          value: 5000,
          stackable: false,
          personal: false,
          status: "active",
          min_order_amount: 10000,
          max_discount_amount: null,
          currency: "KRW",
          expires_at: null,
          issued_quantity: 100,
          issued_per_user: 2,
          used_per_user: 1,
          usage_limit_total: null,
          published_at: null,
          shopping_mall_ai_backend_channel_id: null,
          shopping_mall_ai_backend_seller_id: null,
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon1);

  // 3. Create a second coupon (to be excluded by stacking rule)
  const coupon2Code = `EXCLUDE${RandomGenerator.alphaNumeric(6)}`;
  const coupon2 =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: coupon2Code,
          type: "fixed",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          value: 2000,
          stackable: false,
          personal: false,
          status: "active",
          min_order_amount: 5000,
          max_discount_amount: null,
          currency: "KRW",
          expires_at: null,
          issued_quantity: 100,
          issued_per_user: 2,
          used_per_user: 1,
          usage_limit_total: null,
          published_at: null,
          shopping_mall_ai_backend_channel_id: null,
          shopping_mall_ai_backend_seller_id: null,
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon2);

  // 4. Create coupon stacking rule forbidding coupon2 from stacking with coupon1
  const stackingRuleInput: IShoppingMallAiBackendCouponStackingRule.ICreate = {
    shopping_mall_ai_backend_coupon_id: coupon1.id as string &
      tags.Format<"uuid">,
    excluded_coupon_id: coupon2.id as string & tags.Format<"uuid">,
    type: "deny",
    applies_to_type: null,
  };
  const stackingRule =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.create(
      connection,
      {
        couponId: coupon1.id as string & tags.Format<"uuid">,
        body: stackingRuleInput,
      },
    );
  typia.assert(stackingRule);

  // 5. Validate stacking rule result
  TestValidator.equals(
    "stacking rule coupon id matches",
    stackingRule.shopping_mall_ai_backend_coupon_id,
    stackingRuleInput.shopping_mall_ai_backend_coupon_id,
  );
  TestValidator.equals(
    "excluded coupon id matches",
    stackingRule.excluded_coupon_id,
    stackingRuleInput.excluded_coupon_id,
  );
  TestValidator.equals(
    "stacking rule type matches",
    stackingRule.type,
    stackingRuleInput.type,
  );
  TestValidator.equals(
    "applies_to_type should match",
    stackingRule.applies_to_type,
    stackingRuleInput.applies_to_type,
  );
  TestValidator.predicate(
    "stacking rule has required fields (id, coupon id, excluded id, type, created_at)",
    stackingRule.id !== undefined && stackingRule.created_at !== undefined,
  );
}
