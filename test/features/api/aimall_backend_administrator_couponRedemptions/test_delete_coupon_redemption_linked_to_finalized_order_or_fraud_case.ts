import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test that deletion of a coupon redemption associated with a finalized order
 * or fraud/audit context is correctly blocked.
 *
 * This test simulates a coupon redemption record that should be protected from
 * deletion as per business compliance rules (e.g., compliance, fraud, or audit
 * linkage). It asserts that attempts to delete such a record result in a
 * business-rule error, and deletion does not proceed.
 *
 * Steps:
 *
 * 1. Create a coupon redemption record with a non-null order_id and a 'success'
 *    redemption_status to mimic linkage to a finalized order or compliance
 *    context.
 * 2. Attempt to delete this coupon redemption record through the DELETE endpoint.
 * 3. Assert that deletion is blocked by business logic and an error is thrown
 *    (TestValidator.error ensures correct negative path handling).
 *
 * Note: Because no read endpoints are available, the test only validates the
 * error response for deletion.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_delete_coupon_redemption_linked_to_finalized_order_or_fraud_case(
  connection: api.IConnection,
) {
  // 1. Create a coupon redemption record simulating protection by compliance/fraud/finalized order
  const couponRedemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
          order_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(couponRedemption);

  // 2. Attempt deletion: should be blocked, error expected
  await TestValidator.error(
    "should block deletion of coupon redemption under compliance or investigation",
  )(() =>
    api.functional.aimall_backend.administrator.couponRedemptions.erase(
      connection,
      {
        couponRedemptionId: couponRedemption.id,
      },
    ),
  );
}
