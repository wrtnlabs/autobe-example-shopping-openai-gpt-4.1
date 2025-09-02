import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

export async function test_api_admin_coupon_soft_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for admin-initiated soft deletion of a coupon. Validates:
   *
   * - Admin can authenticate and gain privileges to perform coupon management
   * - Coupon policy can be created through the proper API
   * - Soft deletion successfully sets the deleted_at field (logical removal)
   * - Coupon record exists after deletion for audit/evidence, but is excluded
   *   from active (if supported)
   *
   * Workflow:
   *
   * 1. Register a new admin account and authenticate
   * 2. As admin, create a new coupon with business-compliant random data
   * 3. Soft-delete that coupon with the DELETE endpoint
   * 4. (If implemented: re-query/retrieve the coupon by direct fetch or audit API)
   * 5. Validate through DTO state and error conditions:
   *
   *    - No error is thrown during deletion
   *    - Deleted_at is set (if retrievable)
   */

  // 1. Register and authenticate a new admin account
  const adminUsername: string = RandomGenerator.alphaNumeric(10);
  const adminEmail: string = `${RandomGenerator.alphaNumeric(8)}@testco.com`;
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin account email matches",
    admin.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin account is active",
    admin.admin.is_active === true,
  );

  // 2. Create a coupon as an authenticated admin
  const code = RandomGenerator.alphaNumeric(10).toUpperCase();
  const policyType = RandomGenerator.pick([
    "fixed",
    "percentage",
    "shipping",
    "event",
    "personal",
  ] as const);
  const isPercent = policyType === "percentage";
  const couponCreate: IShoppingMallAiBackendCoupon.ICreate = {
    code,
    type: policyType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    value: isPercent ? 10 : 10000,
    min_order_amount: isPercent ? 50000 : null,
    max_discount_amount: isPercent ? 5000 : null,
    currency: isPercent ? null : "KRW",
    expires_at: null,
    stackable: RandomGenerator.pick([true, false] as const),
    personal: policyType === "personal",
    issued_quantity: 100,
    issued_per_user: policyType === "personal" ? 1 : 5,
    used_per_user: policyType === "personal" ? 1 : null,
    usage_limit_total: 100,
    published_at: null,
    status: "active",
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
  };
  const createdCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: couponCreate,
      },
    );
  typia.assert(createdCoupon);
  TestValidator.equals("coupon code matches", createdCoupon.code, code);
  TestValidator.predicate(
    "coupon not deleted initially",
    createdCoupon.deleted_at === null || createdCoupon.deleted_at === undefined,
  );

  // 3. Soft-delete the coupon
  await api.functional.shoppingMallAiBackend.admin.coupons.erase(connection, {
    couponId: typia.assert<string & tags.Format<"uuid">>(createdCoupon.id),
  });
  // (Retrieval after delete is not implemented in current API set.)
}
