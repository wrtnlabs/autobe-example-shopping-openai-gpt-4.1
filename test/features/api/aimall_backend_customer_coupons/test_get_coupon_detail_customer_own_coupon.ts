import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that an authenticated customer can retrieve the details of their own
 * coupon by couponId.
 *
 * This test ensures:
 *
 * 1. The customer fetches a list of their own coupons to determine a valid
 *    couponId to test.
 * 2. The customer retrieves detail for that coupon using the couponId.
 * 3. All atomic fields (id, code, discount_campaign_id, customer_id, status,
 *    issued_at, expires_at, redeemed_at) are present and identical between list
 *    and detail APIs.
 * 4. The coupon from both list and detail endpoints is assigned to the
 *    authenticated customer (customer_id correctness).
 * 5. If the authenticated user has no available coupons, the test gracefully skips
 *    (no testable data).
 */
export async function test_api_aimall_backend_customer_coupons_test_get_coupon_detail_customer_own_coupon(
  connection: api.IConnection,
) {
  // 1. List all coupons assigned to the current customer
  const couponList =
    await api.functional.aimall_backend.customer.coupons.index(connection);
  typia.assert(couponList);

  // If the customer has no coupons, skip (nothing to test)
  if (!couponList.data || couponList.data.length === 0) return;

  // Use the first available coupon for testing
  const couponSummary = couponList.data[0];

  // 2. Fetch detail of the coupon by couponId
  const couponDetail = await api.functional.aimall_backend.customer.coupons.at(
    connection,
    {
      couponId: couponSummary.id,
    },
  );
  typia.assert(couponDetail);

  // 3. Validate all atomic fields match between list and detail responses
  // These fields are: id, code, discount_campaign_id, customer_id, status, issued_at, expires_at, redeemed_at
  TestValidator.equals("coupon ID matches")(couponDetail.id)(couponSummary.id);
  TestValidator.equals("campaign ID matches")(
    couponDetail.discount_campaign_id,
  )(couponSummary.discount_campaign_id);
  TestValidator.equals("code matches")(couponDetail.code)(couponSummary.code);
  TestValidator.equals("status matches")(couponDetail.status)(
    couponSummary.status,
  );
  TestValidator.equals("issued_at matches")(couponDetail.issued_at)(
    couponSummary.issued_at,
  );
  TestValidator.equals("expires_at matches")(couponDetail.expires_at)(
    couponSummary.expires_at,
  );
  TestValidator.equals("redeemed_at matches")(couponDetail.redeemed_at)(
    couponSummary.redeemed_at,
  );

  // 4. Validate that coupon is indeed assigned to the customer
  // (customer_id present and consistent)
  TestValidator.equals("customer_id matches")(couponDetail.customer_id)(
    couponSummary.customer_id,
  );
  TestValidator.predicate(
    "customer_id should be defined for a customer's coupon",
  )(
    couponDetail.customer_id !== null && couponDetail.customer_id !== undefined,
  );
}
