import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCoupon";
import type { IPageIAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCouponRedemption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendCouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCouponRedemption";

/**
 * Test retrieval of a paginated list of coupon redemption records as an
 * administrator.
 *
 * This test validates that administrators can fetch coupon redemption records
 * with proper pagination and business field structure. The flow also confirms
 * permission enforcement (only admins are able to access this endpoint), and
 * that the business data - including records and pagination summary fields - is
 * structured and correct.
 *
 * Test Steps:
 *
 * 1. Use the admin coupon creation API to create a new coupon (prerequisite).
 * 2. Use the admin coupon redemption creation API to log a redemption for that
 *    coupon with required audit context.
 * 3. Use the couponRedemptions index API as administrator to retrieve paged
 *    redemption records.
 * 4. Validate that the response pagination metadata (current, limit, records,
 *    pages) is present and correct.
 * 5. Assert that the newly created redemption record is returned and all business
 *    key fields are present.
 * 6. (Edge) Test basic pagination logic: e.g., limit = 1 returns data of length <=
 *    1, current = 2 skips the first record(s).
 * 7. (Security) Simulate a non-administrator (if possible) or tamper with
 *    connection context and assert an error is thrown or access is denied.
 */
export async function test_api_aimall_backend_administrator_couponRedemptions_index(
  connection: api.IConnection,
) {
  // 1. Create a coupon as administrator
  const coupon: IAimallBackendCoupon =
    await api.functional.aimall_backend.administrator.coupons.create(
      connection,
      {
        body: {
          discount_campaign_id: typia.random<string & tags.Format<"uuid">>(),
          customer_id: null,
          code: `E2ECOUPON${typia.random<string>().slice(0, 8)}`,
          status: "issued",
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
        } satisfies IAimallBackendCoupon.ICreate,
      },
    );
  typia.assert(coupon);

  // 2. Create a coupon redemption for that coupon
  const redemption: IAimallBackendCouponRedemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.create(
      connection,
      {
        body: {
          coupon_id: coupon.id,
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          discount_campaign_id: coupon.discount_campaign_id,
          redeemed_at: new Date().toISOString(),
          redemption_status: "success",
          order_id: null,
          product_id: null,
        } satisfies IAimallBackendCouponRedemption.ICreate,
      },
    );
  typia.assert(redemption);

  // 3. Retrieve paginated redemption list as administrator
  const page: IPageIAimallBackendCouponRedemption =
    await api.functional.aimall_backend.administrator.couponRedemptions.index(
      connection,
    );
  typia.assert(page);

  // 4. Validate pagination structure
  TestValidator.predicate("pagination structure exists")(!!page.pagination);
  TestValidator.predicate("pagination current page >= 1")(
    page.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0")(page.pagination.limit > 0);
  TestValidator.predicate("pagination records >= 1")(
    page.pagination.records >= 1,
  );
  TestValidator.predicate("pagination pages >= 1")(page.pagination.pages >= 1);

  // 5. Assert the new redemption record is included (by id)
  const found = page.data.find((r) => r.id === redemption.id);
  TestValidator.predicate("created redemption record exists")(!!found);

  // 6. Assert business fields present on redemption record
  if (found) {
    TestValidator.equals("coupon_id matches")(found.coupon_id)(coupon.id);
    TestValidator.equals("customer_id matches")(found.customer_id)(
      redemption.customer_id,
    );
    TestValidator.equals("redemption_status matches")(found.redemption_status)(
      "success",
    );
    TestValidator.equals("discount_campaign_id matches")(
      found.discount_campaign_id,
    )(coupon.discount_campaign_id);
    TestValidator.equals("order_id matches")(found.order_id)(null);
    TestValidator.equals("product_id matches")(found.product_id)(null);
  }

  // 7. (Edge/Permission) Simulate non-admin context: tamper with headers
  const invalidConn = {
    ...connection,
    headers: { ...connection.headers, Authorization: "Bearer INVALIDTOKEN" },
  };
  await TestValidator.error("non-admin/invalid token is denied access")(
    async () => {
      await api.functional.aimall_backend.administrator.couponRedemptions.index(
        invalidConn,
      );
    },
  );

  // 8. Pagination edge: data length <= limit
  TestValidator.predicate("data length <= limit")(
    page.data.length <= page.pagination.limit,
  );
}
