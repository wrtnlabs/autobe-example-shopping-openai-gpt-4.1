import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test successful hard deletion of a coupon redemption record by administrator.
 *
 * Validates that a coupon redemption log can be permanently removed from the
 * system, ensures that a deleted record cannot be retrieved or deleted again,
 * and that the operation is (per specification) audit-logged.
 *
 * Workflow:
 *
 * 1. Create a coupon redemption record via POST
 *    /aimall-backend/administrator/couponRedemptions.
 * 2. Delete the record via DELETE
 *    /aimall-backend/administrator/couponRedemptions/{couponRedemptionId}.
 * 3. Attempt to delete the record again and expect an error, confirming hard
 *    deletion.
 * 4. (Note: Audit log cannot be validated here, as no such endpoint is available.)
 *
 * This test verifies both success and correct irreversible deletion behavior
 * according to business requirements and available API contracts.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_delete_coupon_redemption_record_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a coupon redemption record
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: typia.random<IAimallBackendCouponRedemption.ICreate>(),
      },
    );
  typia.assert(redemption);

  // 2. Permanently delete the created coupon redemption record
  await api.functional.aimall_backend.administrator.couponRedemptions.erase(
    connection,
    {
      couponRedemptionId: redemption.id,
    },
  );

  // 3. Try to delete the same record again: should result in an error (not found or already deleted)
  await TestValidator.error(
    "coupon redemption should no longer exist for deletion",
  )(() =>
    api.functional.aimall_backend.administrator.couponRedemptions.erase(
      connection,
      {
        couponRedemptionId: redemption.id,
      },
    ),
  );

  // 4. (Audit logging of the action is expected per API, but cannot be further verified in this test)
}
