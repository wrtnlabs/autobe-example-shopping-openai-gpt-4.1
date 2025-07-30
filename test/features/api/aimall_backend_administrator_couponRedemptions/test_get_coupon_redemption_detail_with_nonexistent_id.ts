import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Validate not-found response when retrieving a non-existent coupon redemption.
 *
 * This test ensures that the administrator API endpoint does not leak
 * information or return sensitive data when queried with a couponRedemptionId
 * that does not exist in the database. This is important for both back-office
 * security and regulatory audit requirements. It should return a not-found
 * error (404), with no information about whether the ID was ever valid or what
 * its data was.
 *
 * Steps:
 *
 * 1. Attempt to fetch a coupon redemption by a random (guaranteed non-existent)
 *    UUID as couponRedemptionId.
 * 2. Validate that the request results in a not-found error (usually HTTP 404),
 *    with no sensitive data disclosed in the output.
 * 3. Ensure that the error mechanism is robust, and the output is not mistaken for
 *    a successful payload.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_test_get_coupon_redemption_detail_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent couponRedemptionId (UUID format)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch coupon redemption detail by invalid ID
  await TestValidator.error(
    "not found error when couponRedemptionId does not exist",
  )(async () => {
    await api.functional.aimall_backend.administrator.couponRedemptions.at(
      connection,
      {
        couponRedemptionId: nonExistentId,
      },
    );
  });
}
