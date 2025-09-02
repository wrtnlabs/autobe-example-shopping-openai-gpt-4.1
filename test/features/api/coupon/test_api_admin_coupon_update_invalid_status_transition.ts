import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

export async function test_api_admin_coupon_update_invalid_status_transition(
  connection: api.IConnection,
) {
  /**
   * Validates enforcement of business rules on coupon status transitions by
   * admin.
   *
   * Business flow:
   *
   * 1. Registers an admin account and obtains authorization.
   * 2. Admin creates a coupon with status 'active'.
   * 3. Admin legitimately updates coupon status to terminal ('expired').
   * 4. Attempts to revert the terminal status back to 'active' (should fail per
   *    business logic).
   * 5. Confirms that coupon status was not reverted by the failed update attempt.
   *
   * This ensures the API prevents invalid coupon status transitions and
   * enforces immutability of terminal states.
   */
  // 1. Register admin (auth)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(10)}@autobetest.co.kr`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuth);
  // 2. Create coupon (status = 'active')
  const couponInput: IShoppingMallAiBackendCoupon.ICreate = {
    code: RandomGenerator.alphaNumeric(12),
    type: "fixed",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    value: 10_000,
    min_order_amount: 30_000,
    max_discount_amount: null,
    currency: "KRW",
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(),
    stackable: false,
    personal: false,
    issued_quantity: 100,
    issued_per_user: 1,
    used_per_user: 1,
    usage_limit_total: 100,
    published_at: new Date().toISOString(),
    shopping_mall_ai_backend_channel_id: null,
    shopping_mall_ai_backend_seller_id: null,
    status: "active",
  };
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      { body: couponInput },
    );
  typia.assert(coupon);
  TestValidator.equals(
    "coupon status is initially active",
    coupon.status,
    "active",
  );
  // 3. Transition to terminal status (e.g., 'expired')
  const updatedCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.update(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {
          status: "expired",
        } satisfies IShoppingMallAiBackendCoupon.IUpdate,
      },
    );
  typia.assert(updatedCoupon);
  TestValidator.equals(
    "coupon status is now expired",
    updatedCoupon.status,
    "expired",
  );
  // 4. Attempt illegal transition back to 'active' (should error)
  await TestValidator.error(
    "should not permit terminal coupon status transition back to active",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.update(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          body: {
            status: "active",
          } satisfies IShoppingMallAiBackendCoupon.IUpdate,
        },
      );
    },
  );
  // 5. Confirm state unchanged (API has no get endpoint, so call update with empty body as a no-op)
  const couponAfter =
    await api.functional.shoppingMallAiBackend.admin.coupons.update(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {},
      },
    );
  typia.assert(couponAfter);
  TestValidator.equals(
    "coupon status remains expired after failed transition",
    couponAfter.status,
    "expired",
  );
}
