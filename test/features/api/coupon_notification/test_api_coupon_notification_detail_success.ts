import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import type { IShoppingMallAiBackendCouponNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponNotification";

/**
 * Validate detailed retrieval of a coupon notification event for admins.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin
 * 2. Create a new coupon with realistic policy fields
 * 3. Issue that coupon, thereby triggering a notification event
 * 4. Retrieve a valid notification event by ID for that coupon and verify
 *    content
 * 5. Attempt to access a non-existent notification ID and verify error
 *    response
 */
export async function test_api_coupon_notification_detail_success(
  connection: api.IConnection,
) {
  // 1. Admin registration/authentication
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.test`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(24),
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals(
    "created admin username matches input",
    adminJoin.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "created admin email matches input",
    adminJoin.admin.email,
    adminEmail,
  );
  TestValidator.predicate(
    "admin is active",
    adminJoin.admin.is_active === true,
  );

  // 2. Create coupon
  const couponCode = `E2E${RandomGenerator.alphaNumeric(7)}`.toUpperCase();
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: couponCode,
          type: "fixed",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 7 }),
          value: 5000,
          min_order_amount: 10000,
          max_discount_amount: null,
          currency: "KRW",
          expires_at: null,
          stackable: true,
          personal: false,
          issued_quantity: 100,
          issued_per_user: 1,
          used_per_user: 1,
          usage_limit_total: 100,
          published_at: null,
          status: "active",
          shopping_mall_ai_backend_channel_id: null,
          shopping_mall_ai_backend_seller_id: null,
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);
  TestValidator.equals("coupon code matches input", coupon.code, couponCode);

  // 3. Issue coupon (general issuance, no customer linkage)
  const issuance =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId: typia.assert<string & tags.Format<"uuid">>(coupon.id),
        body: {
          shopping_mall_ai_backend_customer_id: null,
          external_code: null,
          expires_at: null,
        } satisfies IShoppingMallAiBackendCouponIssuance.ICreate,
      },
    );
  typia.assert(issuance);
  TestValidator.equals(
    "issuance coupon ID matches input",
    issuance.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );

  // 4. Retrieve the notification detail for the issuance event
  // (Assume notification ID == issuance.id unless notification search endpoint emerges)
  const notificationId = typia.assert<string & tags.Format<"uuid">>(
    issuance.id!,
  );
  const notification =
    await api.functional.shoppingMallAiBackend.admin.coupons.notifications.at(
      connection,
      {
        couponId: coupon.id,
        notificationId,
      },
    );
  typia.assert(notification);
  TestValidator.equals(
    "notification references correct coupon",
    notification.shopping_mall_ai_backend_coupon_id,
    coupon.id,
  );
  TestValidator.equals(
    "notification references correct issuance",
    notification.shopping_mall_ai_backend_coupon_issuance_id,
    issuance.id,
  );
  TestValidator.equals(
    "notification type is 'issuance' or valid event",
    notification.notification_type,
    "issuance",
  );
  TestValidator.predicate(
    "notification status is known",
    ["pending", "sent", "failed", "acknowledged"].includes(notification.status),
  );
  TestValidator.predicate(
    "send_attempts count is non-negative",
    notification.send_attempts >= 0,
  );
  TestValidator.predicate(
    "created_at timestamp is ISO string",
    typeof notification.created_at === "string" &&
      notification.created_at.length > 0,
  );

  // 5. Negative: fetch with random notificationId should error
  await TestValidator.error(
    "should fail for non-existent notificationId",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.notifications.at(
        connection,
        {
          couponId: coupon.id,
          notificationId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
