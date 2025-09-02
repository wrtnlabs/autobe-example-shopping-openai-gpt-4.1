import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";

/**
 * Test successful creation of a coupon issuance by an authenticated admin
 * user.
 *
 * This test covers the flow where an admin creates a coupon issuance record
 * using the API:
 *
 * 1. Register a new system admin with /auth/admin/join (guarantees admin
 *    authentication).
 * 2. Assume a valid coupon UUID exists (as coupon creation endpoint is not
 *    provided, use random UUID for couponId).
 * 3. Call POST /shoppingMallAiBackend/admin/coupons/{couponId}/issuances with
 *    valid issuance data (customerId may be assigned randomly or as null).
 * 4. Validate that the API responds with a proper issuance object, including
 *    audit fields, correct linkage to the coupon, correct customer/id, and
 *    an issued_at timestamp.
 */
export async function test_api_coupon_issuance_create_success_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate (returns tokens in response)
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(6)}@mall-admin.com`;
  const adminPasswordHash = RandomGenerator.alphaNumeric(16); // Represents backend-hashed password for test
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPasswordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResp);
  const admin = adminJoinResp.admin;
  // 2. Simulate an existing coupon (couponId) - use a random UUID for the purposes of test data
  const couponId = typia.random<string & tags.Format<"uuid">>();
  // 3. Construct a valid coupon issuance input (for a particular customer or generic, with optional external_code and expires_at)
  const issuanceInput: IShoppingMallAiBackendCouponIssuance.ICreate = {
    shopping_mall_ai_backend_customer_id:
      Math.random() < 0.5 ? typia.random<string & tags.Format<"uuid">>() : null,
    external_code:
      Math.random() < 0.5 ? RandomGenerator.alphaNumeric(10) : null,
    expires_at:
      Math.random() < 0.5
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
  };
  // 4. Issue the coupon
  const issuance =
    await api.functional.shoppingMallAiBackend.admin.coupons.issuances.createIssuance(
      connection,
      {
        couponId,
        body: issuanceInput,
      },
    );
  typia.assert(issuance);
  // 5. Validate the response fields
  TestValidator.equals(
    "couponId is set correctly",
    issuance.shopping_mall_ai_backend_coupon_id,
    couponId,
  );
  if (
    issuanceInput.shopping_mall_ai_backend_customer_id !== null &&
    issuanceInput.shopping_mall_ai_backend_customer_id !== undefined
  ) {
    TestValidator.equals(
      "issued to correct customer",
      issuance.shopping_mall_ai_backend_customer_id,
      issuanceInput.shopping_mall_ai_backend_customer_id,
    );
  }
  if (
    issuanceInput.external_code !== null &&
    issuanceInput.external_code !== undefined
  ) {
    TestValidator.equals(
      "external_code set on issuance",
      issuance.external_code,
      issuanceInput.external_code,
    );
  }
  if (
    issuanceInput.expires_at !== null &&
    issuanceInput.expires_at !== undefined
  ) {
    TestValidator.equals(
      "expires_at set on issuance",
      issuance.expires_at,
      issuanceInput.expires_at,
    );
  }
  TestValidator.predicate(
    "issuance status should be present",
    issuance.status !== undefined && issuance.status !== null,
  );
  TestValidator.predicate(
    "issued_at timestamp should be present",
    issuance.issued_at !== undefined && issuance.issued_at !== null,
  );
}
