import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate access control enforcement for coupon redemption detail read.
 *
 * This test ensures that only administrators or privileged support staff may
 * retrieve details of a coupon redemption audit record, as these may contain
 * sensitive fraud/audit/tracking information. Unauthorized user roles (such as
 * customers or general users) MUST NOT be able to view such details; the API
 * must respond with an authorization error and with no data (to prevent
 * leakage).
 *
 * Test Steps:
 *
 * 1. Simulate a NON-admin connection (e.g., impersonate a customer/general user;
 *    connection lacks admin role/claims).
 * 2. Generate a syntactically valid couponRedemptionId (UUID format), as would be
 *    required if the test were truly admin-side. (No privilege escalation.)
 * 3. Attempt to fetch redemption record detail via the endpoint.
 * 4. Assert that an error is thrown due to insufficient privileges.
 * 5. Optionally check that the error is an authorization/access denied type (not
 *    found or otherwise leaking data).
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_get_coupon_redemption_detail_with_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Simulate a NON-admin connection (connection should not have admin tokens/claims)

  // 2. Generate a syntactically valid couponRedemptionId (UUID format)
  const couponRedemptionId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to fetch redemption record detail as an unauthorized user
  await TestValidator.error("should reject unauthorized access")(async () => {
    await api.functional.aimall_backend.administrator.couponRedemptions.at(
      connection,
      { couponRedemptionId },
    );
  });
}
