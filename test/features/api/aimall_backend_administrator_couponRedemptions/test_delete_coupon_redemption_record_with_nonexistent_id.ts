import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test deletion of a non-existent coupon redemption log by ID (admin
 * operation).
 *
 * This test simulates an administrator's attempt to permanently delete a coupon
 * redemption log record that does not exist in the system. The purpose is to
 * verify that:
 *
 * 1. The API correctly returns a not-found (404) error when the record does not
 *    exist.
 * 2. No real record is removed as a result of the operation.
 * 3. (Indirect) The failed attempt would be audit logged, though E2E cannot check
 *    logs directly.
 *
 * Step-by-step:
 *
 * 1. Generate a random UUID to represent a non-existent couponRedemptionId.
 * 2. Attempt to DELETE the coupon redemption record with this ID as an
 *    administrator.
 * 3. Assert that the API throws a not-found error (using TestValidator.error).
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_erase_nonexistent(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID representing a non-existent couponRedemptionId
  const fakeCouponRedemptionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to delete with the random/non-existent couponRedemptionId
  await TestValidator.error(
    "should throw not-found on missing couponRedemptionId",
  )(async () => {
    await api.functional.aimall_backend.administrator.couponRedemptions.erase(
      connection,
      { couponRedemptionId: fakeCouponRedemptionId },
    );
  });

  // 3. Note: The E2E cannot verify audit logging or system data side-effects directly.
}
