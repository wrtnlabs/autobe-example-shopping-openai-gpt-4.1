import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test prevention of unauthorized coupon redemption deletion.
 *
 * This test verifies that only administrators are permitted to delete coupon
 * redemption records via the DELETE
 * /aimall-backend/administrator/couponRedemptions/{couponRedemptionId}
 * endpoint. If a user without admin privileges (e.g., customer or regular
 * staff) attempts to delete a record, the operation must be denied and an
 * appropriate error should be raised (regardless of error message/type).
 *
 * Test Steps:
 *
 * 1. Create a coupon redemption record as administrator (using the standard
 *    connection)
 * 2. Simulate non-admin role by removing authentication headers from the
 *    connection object
 * 3. Attempt to delete the coupon redemption as the (now unauthorized) user and
 *    assert that an error occurs
 * 4. (If desired, re-delete as admin to clean up, but not strictly necessary for
 *    this negative test)
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_prevent_unauthorized_coupon_redemption_deletion(
  connection: api.IConnection,
) {
  // 1. Create a coupon redemption as administrator
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: typia.random<IAimallBackendCouponRedemption.ICreate>(),
      },
    );
  typia.assert(redemption);

  // 2. Simulate non-administrator by clearing the authentication headers
  const unauthorizedConnection = { ...connection, headers: {} };

  // 3. Attempt deletion as non-admin, expect error (authorization failure)
  await TestValidator.error("Non-admin deletion should fail")(() =>
    api.functional.aimall_backend.administrator.couponRedemptions.erase(
      unauthorizedConnection,
      {
        couponRedemptionId: redemption.id,
      },
    ),
  );
}
