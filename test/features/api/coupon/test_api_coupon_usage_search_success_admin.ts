import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponUsage";
import type { IPageIShoppingMallAiBackendCouponUsage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponUsage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_coupon_usage_search_success_admin(
  connection: api.IConnection,
) {
  /**
   * Test admin ability to search and paginate coupon usage records by couponId,
   * exercising filter effectiveness and correct pagination metadata.
   *
   * 1. Register and log in as an admin using join API for authorization.
   * 2. Use a valid couponId (for test, generate random UUID simulating test
   *    setup).
   * 3. For that coupon, perform PATCH
   *    /shoppingMallAiBackend/admin/coupons/{couponId}/usages: a) With no
   *    filters (get all) b) Filter by status (e.g., 'success') c) Filter by
   *    used_at date range d) Optionally, by customer_id if any data
   * 4. Assert responses: All returned records match the filter, and pagination
   *    metadata matches result count, empty result returned for false filter.
   */

  // 1. Register and authenticate admin
  const adminCreate: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(24),
    name: RandomGenerator.name(),
    email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
    is_active: true,
    phone_number: null,
  };
  const authResp = await api.functional.auth.admin.join(connection, {
    body: adminCreate,
  });
  typia.assert(authResp);

  // 2. Controlled couponId (simulate existence for integration)
  const couponId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // a) No filter: get all usages for couponId
  const res_all =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
      connection,
      {
        couponId,
        body: {},
      },
    );
  typia.assert(res_all);
  // Removed invalid assertion: cannot filter used records by couponId directly.

  // b) Status filter: e.g., 'success'
  const res_status =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
      connection,
      {
        couponId,
        body: { status: "success" },
      },
    );
  typia.assert(res_status);
  TestValidator.predicate(
    "all usages for status 'success'",
    res_status.data.every((r) => r.status === "success"),
  );

  // c) used_at_from / used_at_to filter
  const used_at_from = new Date(Date.now() - 86400000).toISOString();
  const used_at_to = new Date().toISOString();
  const res_daterange =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
      connection,
      {
        couponId,
        body: { used_at_from, used_at_to },
      },
    );
  typia.assert(res_daterange);
  TestValidator.predicate(
    "all usages' used_at within date range",
    res_daterange.data.every(
      (r) => r.used_at >= used_at_from && r.used_at <= used_at_to,
    ),
  );

  // d) Filter by customer if any data exists
  if (res_all.data.length > 0) {
    const customer_id = res_all.data[0].shopping_mall_ai_backend_customer_id;
    const res_cust =
      await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
        connection,
        {
          couponId,
          body: { shopping_mall_ai_backend_customer_id: customer_id },
        },
      );
    typia.assert(res_cust);
    TestValidator.predicate(
      "all usages for filtered customer_id",
      res_cust.data.every(
        (r) => r.shopping_mall_ai_backend_customer_id === customer_id,
      ),
    );
  }

  // Validate pagination metadata for all relevant queries
  [res_all, res_status, res_daterange].forEach((result, i) => {
    TestValidator.predicate(
      `pagination.records >= data.length for result #${i}`,
      result.pagination.records >= result.data.length,
    );
  });

  // Negative case: filter gives no data
  const res_none =
    await api.functional.shoppingMallAiBackend.admin.coupons.usages.indexCouponUsage(
      connection,
      {
        couponId,
        body: { status: "___invalid_status_for_test___" },
      },
    );
  typia.assert(res_none);
  TestValidator.equals(
    "no data returned for nonsense status filter",
    res_none.data.length,
    0,
  );
}
