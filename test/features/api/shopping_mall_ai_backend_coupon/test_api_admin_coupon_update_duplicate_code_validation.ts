import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoupon";

/**
 * Coupon update must enforce unique code constraint (should skip: 'code'
 * field update not allowed).
 *
 * According to current API and DTO setup, the coupon 'code' property is not
 * mutable after creation (not present in IUpdate). This test is skipped
 * since the API does not support code updates, and so code uniqueness
 * cannot be violated by update.
 *
 * This implementation intentionally demonstrates that backend logic for
 * code-uniqueness-on-update cannot be tested at the E2E layer with
 * available APIs/types.
 */
export async function test_api_admin_coupon_update_duplicate_code_validation(
  connection: api.IConnection,
) {
  // Step 1: Register admin, set token via join
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        phone_number: RandomGenerator.mobile(),
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create two coupons with different codes
  const code1 = RandomGenerator.alphaNumeric(12).toUpperCase();
  const coupon1: IShoppingMallAiBackendCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: code1,
          type: "fixed",
          title: RandomGenerator.name(3),
          value: 6000,
          stackable: false,
          personal: false,
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon1);

  let code2 = RandomGenerator.alphaNumeric(12).toUpperCase();
  if (code2 === code1) code2 = RandomGenerator.alphaNumeric(13).toUpperCase();
  const coupon2: IShoppingMallAiBackendCoupon =
    await api.functional.shoppingMallAiBackend.admin.coupons.create(
      connection,
      {
        body: {
          code: code2,
          type: "fixed",
          title: RandomGenerator.name(3),
          value: 4500,
          stackable: true,
          personal: false,
          status: "active",
        } satisfies IShoppingMallAiBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon2);

  // Step 3:
  // Coupon code cannot be updated (not present in IUpdate DTO). Scenario cannot be implemented.
  // Therefore, this test is reported as skipped.
}
