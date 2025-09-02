import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";

export async function test_api_coupon_issuance_limit_exceeded_failure_admin(
  connection: api.IConnection,
) {
  /**
   * Test error when attempting to issue a coupon to a user who already meets
   * the maximum issuance criteria.
   *
   * Business steps:
   *
   * 1. Register and log in as admin via POST /auth/admin/join (establish
   *    Authorization context)
   * 2. Simulate creation of a coupon with a per-user issuance limit (couponId
   *    generated with random UUID, as coupon creation API is not exposed)
   * 3. Define a target customer UUID
   * 4. Issue the coupon to this customer up to the allowed limit (limit=2 for
   *    test)
   * 5. Attempt to issue the coupon once more to the same customer, expecting a
   *    business error for per-user issuance limit exceeded
   */
  // 1. Admin join (register and log in)
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphabets(6)}@test.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Simulate couponId, as coupon creation API not present
  const couponId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Define test customer UUID
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 4. Issue coupon up to allowed per-user limit (simulate limit = 2)
  const issuanceBody = {
    shopping_mall_ai_backend_customer_id: customerId,
  } satisfies IShoppingMallAiBackendCouponIssuance.ICreate;
  for (let i = 0; i < 2; ++i) {
    const issuance =
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
        connection,
        {
          couponId,
          body: issuanceBody,
        },
      );
    typia.assert(issuance);
    TestValidator.equals(
      `Coupon issuance should return correct customerId (iteration ${i + 1})`,
      issuance.shopping_mall_ai_backend_customer_id,
      customerId,
    );
  }

  // 5. Attempt issuing one additional coupon to exceed limit, expect business error
  await TestValidator.error(
    "Should not allow coupon issuance above per-user limit",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
        connection,
        {
          couponId,
          body: issuanceBody,
        },
      );
    },
  );
}
