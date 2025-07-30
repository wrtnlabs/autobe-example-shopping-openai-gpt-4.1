import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate coupon redemption system failure for invalid/non-existent coupon ID.
 *
 * Ensures the system rejects attempts to redeem a coupon when the provided
 * coupon_id does not exist, is expired, or has been revoked. This is crucial
 * for maintaining fraud defense and data auditability in the rewards system.
 *
 * Steps:
 *
 * 1. Generate truly random UUIDs for coupon_id and customer_id, ensuring they are
 *    not present in the system (simulate an invalid scenario).
 * 2. Attempt to create a coupon redemption event via API, using only the required
 *    fields for the call: coupon_id, customer_id, redeemed_at, and a realistic
 *    status value (e.g. 'failed').
 * 3. Use TestValidator.error to confirm that the server throws an error (business
 *    logic or validation), and does not create a new record.
 *
 * No pre-setup or data dependencies are required, as the focus is on
 * negative/fraud error path.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_create_coupon_redemption_invalid_coupon_fails(
  connection: api.IConnection,
) {
  // Step 1: Generate invalid (non-existent) coupon/customer UUIDs
  const invalidCouponId: string = typia.random<string & tags.Format<"uuid">>();
  const invalidCustomerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Attempt invalid coupon redemption, expecting an error
  await TestValidator.error(
    "should not allow redemption with invalid coupon_id",
  )(async () => {
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: invalidCouponId,
          customer_id: invalidCustomerId,
          redeemed_at: new Date().toISOString(),
          redemption_status: "failed",
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  });
}
