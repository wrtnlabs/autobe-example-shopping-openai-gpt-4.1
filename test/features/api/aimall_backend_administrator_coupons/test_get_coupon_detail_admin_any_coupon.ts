import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCoupon";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";

/**
 * Validate that an administrator can retrieve the full detail of any coupon in
 * the system with only its couponId, regardless of whether it is assigned to a
 * customer or its current status.
 *
 * This test ensures correct backend exposure of coupons for admin: covers
 * issued, redeemed, and expired statuses, and both assigned and unassigned
 * coupons, verifying all fields in the returned dataset.
 *
 * Step-by-step process:
 *
 * 1. Retrieve the full list of coupons as an administrator (using the dependency
 *    API).
 * 2. Select at least one coupon from each status type in the result (issued,
 *    redeemed, expired; if available) and note their couponIds for detail
 *    querying.
 * 3. For each selected couponId, fetch the detailed coupon record using the
 *    GET-by-couponId endpoint.
 * 4. Assert that all returned fields (id, discount_campaign_id, customer_id, code,
 *    status, issued_at, expires_at, redeemed_at) match those in the original
 *    list (if present) and satisfy schema requirements.
 * 5. Ensure no error is thrown for any couponId and that all types of coupons
 *    (regardless of assignment or status) are accessible.
 */
export async function test_api_aimall_backend_administrator_coupons_get_coupon_detail_admin_any_coupon(
  connection: api.IConnection,
) {
  // 1. Retrieve list of all coupons for admin
  const page =
    await api.functional.aimall_backend.administrator.coupons.index(connection);
  typia.assert(page);
  const data = page.data ?? [];
  TestValidator.predicate("at least one coupon in system")(data.length > 0);

  // 2. Select coupons by unique status (issued, redeemed, expired, if present)
  const statuses = ["issued", "redeemed", "expired"];
  const chosen: IAimallBackendCoupon[] = [];
  for (const status of statuses) {
    const found = data.find((c) => c.status === status);
    if (found) chosen.push(found);
  }
  // If not enough status coverage, still pick up to three arbitrary coupons
  while (chosen.length < 3 && chosen.length < data.length) {
    const maybe = data.find((c) => !chosen.includes(c));
    if (maybe) chosen.push(maybe);
    else break;
  }
  TestValidator.predicate("have at least one coupon to test")(
    chosen.length > 0,
  );

  // 3. For each coupon, fetch detail by couponId and validate
  for (const coupon of chosen) {
    const detail = await api.functional.aimall_backend.administrator.coupons.at(
      connection,
      { couponId: coupon.id },
    );
    typia.assert(detail);
    // 4. Validate all major properties match and are present
    for (const key of [
      "id",
      "discount_campaign_id",
      "customer_id",
      "code",
      "status",
      "issued_at",
      "expires_at",
      "redeemed_at",
    ]) {
      TestValidator.equals(`${key} must match detail/list`)(
        (detail as any)[key],
      )((coupon as any)[key]);
    }
    // 5. No error thrown: test will fail if exception occurs
  }
}
