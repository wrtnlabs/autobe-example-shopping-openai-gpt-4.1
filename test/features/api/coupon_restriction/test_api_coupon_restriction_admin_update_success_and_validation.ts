import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";
import type { IShoppingMallAiBackendCouponRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponRestriction";

export async function test_api_coupon_restriction_admin_update_success_and_validation(
  connection: api.IConnection,
) {
  /**
   * Scenario: End-to-end validation of coupon restriction updating by admin
   *
   * Steps:
   *
   * 1. Register a new admin user and obtain JWT token
   * 2. Create a new coupon as admin
   * 3. Create a restriction on the coupon (product-specific, with start/end time)
   * 4. Update restriction successfully (modify restriction timing,
   *    is_holiday_restricted, reason_code)
   * 5. Confirm update is persisted on the target restriction
   * 6. Attempt update with invalid: end_time < start_time (should raise error)
   * 7. Attempt update with conflicting target (should raise error)
   * 8. Attempt update on a non-existent restriction (should raise error)
   * 9. Attempt update as unauthorized user (should raise error)
   */

  // 1. Admin account creation and authentication
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(10)}@corp.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  const admin = adminAuth.admin;

  // 2. Create coupon policy
  const coupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          type: "fixed",
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          value: 5000,
          min_order_amount: 10000,
          max_discount_amount: 6000,
          currency: "KRW",
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 30,
          ).toISOString(), // expires in 30 days
          stackable: false,
          personal: false,
          issued_quantity: 100,
          issued_per_user: 1,
          used_per_user: 1,
          usage_limit_total: 100,
          published_at: new Date().toISOString(),
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 3. Create initial restriction
  const resCreate =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {
          shopping_mall_ai_backend_coupon_id: coupon.id as string &
            tags.Format<"uuid">,
          shopping_mall_ai_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          start_time: new Date().toISOString(),
          end_time: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 5,
          ).toISOString(),
          weekday_bitmask: 0b0111110,
          is_holiday_restricted: false,
          reason_code: RandomGenerator.alphaNumeric(6),
        } satisfies IShoppingMallAiBackendCouponRestriction.ICreate,
      },
    );
  typia.assert(resCreate);

  // 4. Update restriction with legitimate new end_time, enable holiday restriction, change reason code
  const updatedEndTime = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString();
  const updateResp =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.update(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        restrictionId: resCreate.id as string & tags.Format<"uuid">,
        body: {
          end_time: updatedEndTime,
          is_holiday_restricted: true,
          reason_code: RandomGenerator.alphaNumeric(6),
        } satisfies IShoppingMallAiBackendCouponRestriction.IUpdate,
      },
    );
  typia.assert(updateResp);
  TestValidator.equals(
    "Restriction end_time updated",
    updateResp.end_time,
    updatedEndTime,
  );
  TestValidator.equals(
    "Restriction is_holiday_restricted updated",
    updateResp.is_holiday_restricted,
    true,
  );
  TestValidator.equals(
    "Check restriction id after update",
    updateResp.id,
    resCreate.id,
  );

  // 5. Confirm field values are persisted as expected
  TestValidator.equals(
    "Check end_time after update",
    updateResp.end_time,
    updatedEndTime,
  );
  TestValidator.equals(
    "Check is_holiday_restricted after update",
    updateResp.is_holiday_restricted,
    true,
  );

  // 6. Negative case: Update with end_time before start_time (should error)
  await TestValidator.error(
    "Update restriction with end_time < start_time should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.update(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          restrictionId: resCreate.id as string & tags.Format<"uuid">,
          body: {
            start_time: new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 10,
            ).toISOString(),
            end_time: new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 5,
            ).toISOString(),
          } satisfies IShoppingMallAiBackendCouponRestriction.IUpdate,
        },
      );
    },
  );

  // 7. Negative case: Update to a conflicting target (duplicate product_id as other restriction)
  const secondRes =
    await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.create(
      connection,
      {
        couponId: coupon.id as string & tags.Format<"uuid">,
        body: {
          shopping_mall_ai_backend_coupon_id: coupon.id as string &
            tags.Format<"uuid">,
          shopping_mall_ai_backend_product_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          start_time: new Date().toISOString(),
          end_time: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 6,
          ).toISOString(),
          reason_code: RandomGenerator.alphaNumeric(6),
        } satisfies IShoppingMallAiBackendCouponRestriction.ICreate,
      },
    );
  typia.assert(secondRes);
  await TestValidator.error(
    "Update restriction to conflicting product_id should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.update(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          restrictionId: secondRes.id as string & tags.Format<"uuid">,
          body: {
            shopping_mall_ai_backend_product_id:
              resCreate.shopping_mall_ai_backend_product_id,
          } satisfies IShoppingMallAiBackendCouponRestriction.IUpdate,
        },
      );
    },
  );

  // 8. Negative case: Update a non-existent restriction id (random uuid)
  await TestValidator.error(
    "Update non-existent restriction id should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.update(
        connection,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          restrictionId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            end_time: new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 14,
            ).toISOString(),
          } satisfies IShoppingMallAiBackendCouponRestriction.IUpdate,
        },
      );
    },
  );

  // 9. Negative case: Unauthorized update (no admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized update attempt should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.restrictions.update(
        unauthConn,
        {
          couponId: coupon.id as string & tags.Format<"uuid">,
          restrictionId: resCreate.id as string & tags.Format<"uuid">,
          body: {
            end_time: new Date(
              Date.now() + 1000 * 60 * 60 * 24 * 30,
            ).toISOString(),
          } satisfies IShoppingMallAiBackendCouponRestriction.IUpdate,
        },
      );
    },
  );
}
