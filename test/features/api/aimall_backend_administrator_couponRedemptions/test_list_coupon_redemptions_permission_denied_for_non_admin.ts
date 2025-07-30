import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate administrator-only coupon redemption list access control.
 *
 * This test attempts to access the coupon redemptions list endpoint using a
 * connection that does not have administrator privileges (i.e., using a
 * non-admin account such as a customer). The expected behavior is that the
 * request is denied and the server returns a forbidden or unauthorized error
 * (permission denied). This protects sensitive analytics data for admin use
 * only.
 *
 * Steps:
 *
 * 1. Ensure the test is running with a non-admin connection (e.g., not
 *    authenticated as admin).
 * 2. Attempt to call the coupon redemptions list API endpoint with this context.
 * 3. Verify that the API returns a forbidden or unauthorized error, not permitting
 *    access to non-admin users.
 * 4. Ensure that no valid data is returned to the non-admin connection.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_list_coupon_redemptions_permission_denied_for_non_admin(
  connection: api.IConnection,
) {
  // 1. Ensure the test is running with a non-admin connection (e.g., not authenticated as admin).
  //    (Assume the provided 'connection' is for a customer or user without admin privileges.)

  // 2. Attempt to access administrator-only coupon redemptions list endpoint.
  await TestValidator.error(
    "Non-admin should be denied access to coupon redemptions list",
  )(async () => {
    await api.functional.aimall_backend.administrator.couponRedemptions.index(
      connection,
    );
  });
}
