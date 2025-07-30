import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test updating a coupon as an administrator with valid, mutable fields.
 *
 * This test ensures that an administrator can successfully update a coupon's
 * status and expiration using allowed fields. The workflow is as follows:
 *
 * 1. Create a new coupon as a precondition.
 * 2. Update the coupon (identified by id) by changing its status and expiry date.
 * 3. Confirm the updated coupon reflects these changes.
 * 4. Confirm all other properties remain unchanged.
 */
export async function test_api_aimall_backend_administrator_coupons_test_update_coupon_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new coupon (precondition)
  const couponCreateInput: IAimallBackendCoupon.ICreate = {
    discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
    customer_id: null,
    code: `TESTCOUPON-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
    status: "issued",
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  };
  const created: IAimallBackendCoupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      { body: couponCreateInput },
    );
  typia.assert(created);

  // 2. Update mutable fields (status & expires_at) for this coupon
  const updatedStatus = "expired";
  const updatedExpiry = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days from now
  const updateInput: IAimallBackendCoupon.IUpdate = {
    status: updatedStatus,
    expires_at: updatedExpiry,
  };
  const updated: IAimallBackendCoupon =
    await api.functional.aimall_backend.administrator.coupons.update(
      connection,
      {
        couponId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 3. Verify the updates are present
  TestValidator.equals("coupon id remains the same")(updated.id)(created.id);
  TestValidator.equals("status updated")(updated.status)(updatedStatus);
  TestValidator.equals("expires_at updated")(updated.expires_at)(updatedExpiry);

  // 4. Check other fields remain unchanged
  TestValidator.equals("discount_campaign_id unchanged")(
    updated.discount_campaign_id,
  )(created.discount_campaign_id);
  TestValidator.equals("code unchanged")(updated.code)(created.code);
  TestValidator.equals("issued_at unchanged")(updated.issued_at)(
    created.issued_at,
  );
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    created.customer_id,
  );
}
