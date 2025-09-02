import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

export async function test_api_admin_coupon_soft_delete_idempotency_and_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate soft deletion idempotency and error handling for coupon deletion
   * (admin).
   *
   * This test confirms that:
   *
   * 1. Soft deletion of a valid coupon succeeds for admins (by UUID).
   * 2. Repeated deletion is idempotent, meaning a second call either succeeds
   *    (NOOP) or gracefully fails with a business-controlled error (e.g.,
   *    already deleted).
   * 3. Deleting a non-existent coupon ID returns a proper not-found (404/business)
   *    error.
   *
   * Steps:
   *
   * 1. Authenticate as admin to set up session token for management endpoints.
   * 2. Create a new coupon to be used as the test target.
   * 3. Call the coupon deletion endpoint using the created coupon's UUID (should
   *    succeed).
   * 4. Call the coupon deletion endpoint again with the same UUID (should be
   *    idempotent or business error).
   * 5. Attempt deletion on a random coupon UUID (never issued); expects not-found
   *    error.
   */

  // 1. Admin authentication
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(32);
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(2),
      email: adminEmail,
      is_active: true,
      phone_number: null,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);
  // Authorization header is now active on connection

  // 2. Create coupon
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_channel_id: null,
          shopping_mall_ai_backend_seller_id: null,
          code: RandomGenerator.alphaNumeric(10),
          type: RandomGenerator.pick([
            "fixed",
            "percentage",
            "shipping",
            "event",
          ] as const),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          value: 2000,
          min_order_amount: null,
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
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Soft delete the coupon (first attempt)
  await api.functional.shoppingMallAiBackend.admin.coupons.erase(connection, {
    couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
  });

  // 4. Attempt idempotent duplicate delete (should not throw hard error)
  await TestValidator.error(
    "repeated coupon soft-delete should handle idempotency or business error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.erase(
        connection,
        {
          couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        },
      );
    },
  );

  // 5. Attempt to delete a random, non-existent coupon (should 404 or business error)
  const randomCouponId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "soft delete of non-existent coupon should return not-found error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.erase(
        connection,
        {
          couponId: randomCouponId,
        },
      );
    },
  );
}
