import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates the successful soft deletion (logical removal) of a coupon
 * issuance by an admin.
 *
 * This test covers a full privileged workflow:
 *
 * 1. Join as an admin and get authorization using the /auth/admin/join
 *    endpoint with unique credentials.
 * 2. Create a new coupon (SKIPPED, as no creation API is present in provided
 *    materials).
 * 3. Issue the coupon to a customer (SKIPPED, as no issuance API is present in
 *    provided materials).
 * 4. Use the issued IDs (couponId, issuanceId) to call DELETE
 *    /shoppingMallAiBackend/admin/coupons/{couponId}/issuances/{issuanceId}.
 * 5. Assert that the operation is successful (204 response).
 * 6. (SKIPPED) Validate that issuance is logically deleted - check deleted_at
 *    - can't be done as no read-issuance API is available.
 * 7. (SKIPPED) Confirm that the issuance cannot be used - not possible to
 *    implement without 'use' or 'redeem' API.
 * 8. (SKIPPED) Validate that the deleted record remains for audit - would
 *    require a listing or fetch endpoint.
 *
 * Because only admin join and delete endpoints are provided, pre- and
 * post-conditions are limited by available API surface.
 */
export async function test_api_coupon_issuance_delete_success_admin(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as admin
  const uniqueAdminName = RandomGenerator.alphaNumeric(10);
  const adminJoinBody = {
    username: uniqueAdminName,
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: `${uniqueAdminName}@example.com`,
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // Step 2: (Coupon and issuance creation skipped - not possible with current API surface)
  // Generate random UUIDs to represent couponId/issuanceId as stand-ins for real entities
  const couponId = typia.random<string & tags.Format<"uuid">>();
  const issuanceId = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Perform the soft delete of issuance as privileged admin
  await api.functional.shoppingMallAiBackend.admin.coupons.issuances.eraseIssuance(
    connection,
    {
      couponId,
      issuanceId,
    },
  );

  // Step 4: Post-conditions and audit validation are skipped due to lack of retrieval endpoints
  // We assert the operations above succeed without exceptions.
}
