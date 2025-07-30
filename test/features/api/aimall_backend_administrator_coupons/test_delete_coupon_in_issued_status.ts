import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Test the hard-delete operation on a coupon in the 'issued' status.
 *
 * This test ensures that a coupon voucher in the 'issued' status can be
 * hard-deleted by an administrator. The test will:
 *
 * 1. Create a coupon with 'issued' status (using the create API)
 * 2. Delete the coupon (using the erase API)
 * 3. [Documentation only: If any 'get' endpoint for coupons existed, verify it's
 *    gone]
 * 4. [Not implemented: Audit log verification and edge cases, due to missing
 *    endpoints]
 *
 * Only SDK-covered, technically feasible steps are implemented per project
 * conventions.
 */
export async function test_api_aimall_backend_administrator_coupons_test_delete_coupon_in_issued_status(
  connection: api.IConnection,
) {
  // 1. Create a new coupon with issued status
  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + 5 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 5 days ahead
  const coupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
          code: `TEST-E2E-ISSUED-${Math.floor(Math.random() * 1000000)}`,
          status: "issued",
          issued_at: issuedAt,
          expires_at: expiresAt,
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);
  TestValidator.equals("issued status")(coupon.status)("issued");

  // 2. Delete the coupon by id
  await api.functional.aimall_backend.administrator.coupons.erase(connection, {
    couponId: coupon.id,
  });

  // 3. [No get endpoint provided: would TestValidator.error here if available]

  // 4. Audit logs & additional negative scenarios omitted (missing endpoints in SDK)
}
