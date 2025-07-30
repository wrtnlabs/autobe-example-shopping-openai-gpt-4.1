import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that searching with criteria that cannot be satisfied returns an empty
 * data array and correct pagination.
 *
 * This test ensures that, when searching coupon redemptions using a filter
 * (e.g., invalid customer_id or a date range for which there are no redemption
 * events), the endpoint responds with a success payload (not an error) and
 * returns an empty `data` array with valid pagination (page 1, zero records,
 * etc.), rather than errors or null values. This is to prove the API's behavior
 * is correct in edge cases and that empty results are handled gracefully for UI
 * and analytics scenarios.
 *
 * Steps:
 *
 * 1. Call the coupon redemption search endpoint with a random, invalid customer_id
 *    (UUID) that does not exist.
 * 2. Assert the API returns 200 OK and a response of
 *    IPageIAimallBackendCouponRedemption.
 * 3. Assert that returned data array is empty and pagination metadata shows
 *    records=0 and pages=0.
 * 4. Repeat with a date range far in the past to ensure empty results also
 *    returned for valid but unsatisfiable filters.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_search_returns_empty_on_no_match(
  connection: api.IConnection,
) {
  // 1. Search with an invalid/nonexistent customer_id
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();
  const output1 =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      {
        body: {
          customer_id: invalidCustomerId,
        } satisfies IAimallBackendCouponRedemption.IRequest,
      },
    );
  typia.assert(output1);
  TestValidator.equals("data array empty")(output1.data.length)(0);
  TestValidator.equals("no records")(output1.pagination.records)(0);
  TestValidator.equals("no pages")(output1.pagination.pages)(0);

  // 2. Search with a date range far in the past (should return empty)
  const pastFrom = "2000-01-01T00:00:00.000Z";
  const pastTo = "2000-12-31T23:59:59.999Z";
  const output2 =
    await api.functional.aimall_backend.administrator.couponRedemptions.search(
      connection,
      {
        body: {
          redeemed_from: pastFrom,
          redeemed_to: pastTo,
        } satisfies IAimallBackendCouponRedemption.IRequest,
      },
    );
  typia.assert(output2);
  TestValidator.equals("data array empty")(output2.data.length)(0);
  TestValidator.equals("no records")(output2.pagination.records)(0);
  TestValidator.equals("no pages")(output2.pagination.pages)(0);
}
