import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that deletion of a coupon in 'redeemed' status is forbidden.
 *
 * This test verifies that when a coupon is in status 'redeemed', it cannot be
 * deleted via the admin DELETE endpoint. This is important to preserve business
 * audit/compliance and protect against improper removal of redeemed coupons.
 *
 * Test Steps:
 *
 * 1. Create a new coupon with status 'issued'.
 * 2. Update the coupon status to 'redeemed' (using a valid redemption timestamp).
 * 3. Attempt to delete the coupon using the DELETE API (should fail; expect an
 *    error).
 * 4. Confirm the coupon still exists by updating or querying (additional GET not
 *    present, so use update as probe).
 */
export async function test_api_aimall_backend_administrator_coupons_test_delete_coupon_in_redeemed_status_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a new coupon (status = 'issued')
  const issued_at = new Date().toISOString();
  const expires_at = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // +7 days
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: null, // universal coupon
          code: `REDEEMED-DEL-${Math.floor(Math.random() * 100000)}`,
          status: "issued",
          issued_at,
          expires_at,
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 2. Mark coupon as 'redeemed' and set redeemed_at
  const redeemed_at = new Date().toISOString();
  const redeemed =
    await api.functional.aimall_backend.administrator.coupons.update(
      connection,
      {
        couponId: coupon.id,
        body: {
          status: "redeemed",
          redeemed_at,
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  typia.assert(redeemed);
  TestValidator.equals("status is redeemed")(redeemed.status)("redeemed");
  TestValidator.equals("redeemed_at is set")(redeemed.redeemed_at)(redeemed_at);

  // 3. Attempt to delete the redeemed coupon
  await TestValidator.error("cannot delete redeemed coupon")(async () => {
    await api.functional.aimall_backend.administrator.coupons.erase(
      connection,
      {
        couponId: coupon.id,
      },
    );
  });

  // 4. Confirm the coupon still exists (by trying update again and expecting success)
  const stillThere =
    await api.functional.aimall_backend.administrator.coupons.update(
      connection,
      {
        couponId: coupon.id,
        body: {
          // No changes, probe for existence
        } satisfies IAimallBackendCoupon.IUpdate,
      },
    );
  typia.assert(stillThere);
  TestValidator.equals("coupon still exists")(stillThere.id)(coupon.id);
  TestValidator.equals("status still redeemed")(stillThere.status)("redeemed");
}
