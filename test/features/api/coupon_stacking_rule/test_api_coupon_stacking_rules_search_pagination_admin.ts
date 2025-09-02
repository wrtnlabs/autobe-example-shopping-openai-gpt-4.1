import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";
import type { IPageIShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponStackingRule";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_coupon_stacking_rules_search_pagination_admin(
  connection: api.IConnection,
) {
  /**
   * This test validates searching coupon stacking rules by an admin, including
   * filtering, paging, and security boundaries.
   *
   * Steps:
   *
   * 1. Register a valid admin account (ensure authentication context for all
   *    sub-operations)
   * 2. Create a coupon to own stacking rules
   * 3. Create multiple stacking rules for the coupon, with distinct 'type' and
   *    'applies_to_type' combinations
   * 4. For each search: call stackingRules.indexCouponStackingRules (PATCH) with
   *    varying filter and paging (no filter, by type, by applies_to_type,
   *    pagination)
   * 5. Validate correct rules are returned for each search/variant, including
   *    content and total count
   * 6. Test invalid couponId (random UUID) fails with error
   * 7. Test missing admin auth (simulate by clearing
   *    connection.headers.Authorization) fails with error
   */

  // 1. Register admin and authenticate
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(64), // Mock hash (should be actual hash in prod)
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@test.local`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Create coupon (all required fields + meaningful values)
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(12),
          type: RandomGenerator.pick([
            "fixed",
            "percentage",
            "shipping",
            "personal",
          ] as const),
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          value: 1000,
          min_order_amount: 10000,
          max_discount_amount: 2000,
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
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Create stacking rules with unique combinations
  const stackingRuleInputs: IShoppingMallAiBackendCouponStackingRule.ICreate[] =
    [
      { type: "allow", applies_to_type: "fixed" },
      { type: "allow", applies_to_type: "percentage" },
      { type: "deny", applies_to_type: "shipping" },
      { type: "override", applies_to_type: "personal" },
      { type: "deny", applies_to_type: null },
      { type: "allow", applies_to_type: "shipping" },
      { type: "override", applies_to_type: null },
    ];
  const stackingRules: IShoppingMallAiBackendCouponStackingRule[] = [];
  for (const input of stackingRuleInputs) {
    const rule =
      await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.create(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          body: {
            ...input,
            shopping_mall_ai_backend_coupon_id: coupon.id as string &
              tags.Format<"uuid">,
            excluded_coupon_id: null,
          } satisfies IShoppingMallAiBackendCouponStackingRule.ICreate,
        },
      );
    typia.assert(rule);
    stackingRules.push(rule);
  }

  // 4a. Unfiltered search (should get all)
  const search =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {},
      },
    );
  typia.assert(search);
  TestValidator.equals(
    "Should get all stacking rules without filter",
    search.data.length,
    stackingRules.length,
  );

  // 4b. Filter by type = 'deny'
  const typeDenySearch =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: { type: "deny" },
      },
    );
  typia.assert(typeDenySearch);
  TestValidator.predicate(
    "All rules in deny search have type == 'deny'",
    typeDenySearch.data.every((rule) => rule.type === "deny"),
  );

  // 4c. Filter by appliesToType = 'fixed'
  const appliesToTypeSearch =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: { appliesToType: "fixed" },
      },
    );
  typia.assert(appliesToTypeSearch);
  TestValidator.predicate(
    "All rules in appliesToType search have applies_to_type == 'fixed'",
    appliesToTypeSearch.data.every((rule) => rule.applies_to_type === "fixed"),
  );

  // 4d. Pagination: page 2, limit 2
  const pagedSearch =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: { page: 2, limit: 2 },
      },
    );
  typia.assert(pagedSearch);
  TestValidator.equals(
    "pagedSearch uses limit=2",
    pagedSearch.pagination.limit,
    2,
  );

  // 5. Invalid couponId should fail
  await TestValidator.error("invalid couponId should fail", async () => {
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      connection,
      {
        couponId: typia.random<string & tags.Format<"uuid">>(),
        body: {},
      },
    );
  });

  // 6. Without auth should fail
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error("missing admin auth should fail", async () => {
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.indexCouponStackingRules(
      unauthConn,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {},
      },
    );
  });
}
