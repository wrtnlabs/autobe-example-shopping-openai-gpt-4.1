import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate the enforcement of coupon status transition business rules when
 * updating a coupon.
 *
 * This test verifies that once a coupon has been redeemed (its status is set to
 * 'redeemed'), attempting to revert it back to 'issued' fails according to
 * business rules.
 *
 * Steps:
 *
 * 1. Create a coupon with status 'issued' (using allowed random values for
 *    required fields).
 * 2. Update the coupon to mark it as 'redeemed' by setting status: 'redeemed' and
 *    a valid redeemed_at timestamp.
 * 3. Attempt to update the coupon again, this time trying to revert status back to
 *    'issued'.
 *
 *    - This should not be allowed per business logic and must result in a business
 *         rule/validation error.
 * 4. Validate that an error is thrown (via TestValidator.error), confirming the
 *    backend enforces proper state transitions.
 */
export async function test_api_aimall_backend_administrator_coupons_test_update_coupon_with_invalid_status_transition(
  connection: api.IConnection,
) {
  // 1. Create a coupon (status: 'issued')
  const createInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
    code: `TESTCODE_${RandomGenerator.alphaNumeric(8)}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days later
  };
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: createInput },
    );
  typia.assert(coupon);

  // 2. Mark coupon as redeemed
  const redeemInput: IAimallBackendCoupon.IUpdate = {
    status: "redeemed",
    redeemed_at: new Date().toISOString(),
  };
  const redeemed =
    await api.functional.aimall_backend.administrator.coupons.update(
      connection,
      {
        couponId: coupon.id,
        body: redeemInput,
      },
    );
  typia.assert(redeemed);

  // 3. Attempt illegal transition: revert redeemed coupon back to 'issued' (must fail)
  const illegalInput: IAimallBackendCoupon.IUpdate = {
    status: "issued",
  };
  await TestValidator.error(
    "should not allow reverting a redeemed coupon to issued",
  )(async () => {
    await api.functional.aimall_backend.administrator.coupons.update(
      connection,
      {
        couponId: coupon.id,
        body: illegalInput,
      },
    );
  });
}
