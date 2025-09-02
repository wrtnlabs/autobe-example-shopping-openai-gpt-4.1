import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponStackingRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponStackingRule";

export async function test_api_coupon_stacking_rule_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for soft deletion (logical removal) of a coupon stacking rule by
   * an admin.
   *
   * 1. Register an admin and set up authentication (admin join).
   * 2. Create a coupon as the admin to use as a parent entity.
   * 3. Add a stacking rule to this coupon, retaining its IDs.
   * 4. Soft delete the stacking rule via couponId and stackingRuleId (erase API).
   * 5. Attempt to delete again to ensure error on double-deletion.
   *
   * The test covers: authenticating as admin, resource setup, stacking rule
   * creation, successful logical removal by admin, and error path for
   * double-delete. This aligns with business logic and verifies lifecycle
   * rules.
   */

  // 1. Register an admin for authentication
  const adminUsername = RandomGenerator.name(2).replace(/\s+/g, "_");
  const adminEmail = `${RandomGenerator.alphabets(10)}@autobee.test`;
  const passwordHash = RandomGenerator.alphaNumeric(32);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a coupon as the admin (parent for stacking rule)
  const couponCode = RandomGenerator.alphaNumeric(12).toUpperCase();
  const couponType = "fixed";
  const couponTitle = RandomGenerator.name(3);
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: couponCode,
          type: couponType,
          title: couponTitle,
          value: 5000,
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          stackable: true,
          personal: false,
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Add a stacking rule to this coupon
  const stackingRule =
    await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.create(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          type: "deny",
        } satisfies IShoppingMallAiBackendCouponStackingRule.ICreate,
      },
    );
  typia.assert(stackingRule);

  // 4. Delete (soft delete/logical removal) of the stacking rule
  await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.erase(
    connection,
    {
      couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
      stackingRuleId: typia.assert<string & tags.Format<"uuid">>(
        stackingRule.id,
      ),
    },
  );

  // 5. Attempt to delete again to ensure a suitable error is returned
  await TestValidator.error(
    "double-delete should return suitable error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.stackingRules.erase(
        connection,
        {
          couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
          stackingRuleId: typia.assert<string & tags.Format<"uuid">>(
            stackingRule.id,
          ),
        },
      );
    },
  );
}
