import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate that attempts to update immutable fields of a coupon redemption
 * record are rejected.
 *
 * Coupon redemption records should have immutable analytic/audit keys such as
 * coupon_id and customer_id. This test creates a coupon and a coupon
 * redemption, then attempts to update the redemption with non-permitted fields
 * (coupon_id/customer_id). It expects the API to reject these updates and
 * return a validation error. This ensures business logic enforcement and
 * audit/relational integrity.
 *
 * Test Steps:
 *
 * 1. Create a coupon associated with a new campaign and customer (if needed)
 * 2. Create a coupon redemption event for that coupon and customer
 * 3. Attempt to update the redemption record's coupon_id
 *
 *    - Expect a validation error or rejection response
 * 4. Attempt to update the redemption record's customer_id
 *
 *    - Expect a validation error or rejection response
 * 5. Attempt a valid, allowed update (such as redemption_status or order_id)
 *
 *    - Expect success
 *
 * Steps 3 and 4 validate that changes to analytic/audit columns are not
 * allowed. Step 5 confirms that allowed fields can still be updated as
 * expected.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_update_coupon_redemption_non_mutable_fields_rejected(
  connection: api.IConnection,
) {
  // 1. Create a coupon (with a new random campaign)
  const campaignId = typia.random<string & tags.Format<"uuid">>();
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: campaignId,
          customer_id: customerId,
          code: RandomGenerator.alphaNumeric(10),
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    );
  typia.assert(coupon);

  // 2. Create a coupon redemption for that coupon and customer
  const redemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon.id,
          customer_id: customerId,
          discount_campaign_id: campaignId,
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
          order_id: null,
          product_id: null,
        },
      },
    );
  typia.assert(redemption);

  // 3. Attempt to update immutable coupon_id (expect error)
  await TestValidator.error("cannot update coupon_id")(() =>
    api.functional.aimall_backend.administrator.couponRedemptions.update(
      connection,
      {
        couponRedemptionId: redemption.id,
        // Type casting only for runtime test: coupon_id is NOT in the update DTO
        body: {
          coupon_id: typia.random<string & tags.Format<"uuid">>(),
        } as any,
      },
    ),
  );

  // 4. Attempt to update immutable customer_id (expect error)
  await TestValidator.error("cannot update customer_id")(() =>
    api.functional.aimall_backend.administrator.couponRedemptions.update(
      connection,
      {
        couponRedemptionId: redemption.id,
        // Type casting only for runtime test: customer_id is NOT in the update DTO
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
        } as any,
      },
    ),
  );

  // 5. Valid allowed update
  const updated =
    await api.functional.aimall_backend.administrator.couponRedemptions.update(
      connection,
      {
        couponRedemptionId: redemption.id,
        body: { redemption_status: "failed" },
      },
    );
  typia.assert(updated);
  TestValidator.equals("status updated")(updated.redemption_status)("failed");
}
