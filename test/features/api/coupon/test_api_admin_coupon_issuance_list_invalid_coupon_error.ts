import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import type { IPageIShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponIssuance";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_coupon_issuance_list_invalid_coupon_error(
  connection: api.IConnection,
) {
  /**
   * Validate that listing coupon issuances with an invalid or deleted couponId
   * results in an error.
   *
   * This test ensures that the PATCH
   * /shoppingMallAiBackend/admin/coupons/{couponId}/issuances endpoint rejects
   * requests that reference a non-existent coupon, enforcing entity existence
   * and preventing data leakage.
   *
   * Steps:
   *
   * 1. Register a new admin account via /auth/admin/join to obtain proper
   *    authorization.
   * 2. Attempt to list coupon issuances with a syntactically valid, but
   *    non-existent coupon UUID and a valid request body.
   * 3. Assert that the API returns an error, validating that invalid coupon
   *    references are denied for admin operators.
   *
   * Note: The test does NOT cover soft-deleted couponId cases due to lack of a
   * coupon deletion API in the materials.
   */

  // 1. Register and authorize as admin
  const adminJoinData: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinData,
  });
  typia.assert(adminAuth);

  // 2. Choose a syntactically valid, non-existent couponId
  const nonExistentCouponId = typia.random<string & tags.Format<"uuid">>();

  // Construct a valid body for the listing operation
  const requestBody: IShoppingMallAiBackendCouponIssuance.IRequest = {
    status: RandomGenerator.pick(["issued", "revoked", "used"] as const),
    page: 1,
    limit: 10,
  };

  // 3. Attempt to list issuances and verify error is thrown
  await TestValidator.error(
    "listing coupon issuances for non-existent couponId should throw",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coupons.issuances.index(
        connection,
        {
          couponId: nonExistentCouponId,
          body: requestBody,
        },
      );
    },
  );
}
