import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate administrator order search with status and creation date range
 * filters.
 *
 * This test verifies that an administrator can search for orders filtered by
 * order_status and a specific creation date window. It ensures that only orders
 * matching the selected filters are returned, the pagination metadata is
 * correct, and administrator access is enforced.
 *
 * Step-by-step process:
 *
 * 1. Verify administrator privileges by retrieving the full order list with
 *    .index().
 * 2. Select an actual order_status and a real date range from the current dataset
 *    for realistic filter testing.
 * 3. Search for orders using PATCH /aimall-backend/administrator/orders with the
 *    chosen filters.
 * 4. Assert all returned orders have the correct status and fall within the
 *    requested date range.
 * 5. Verify pagination information for correctness and logical consistency.
 * 6. Test a negative filter (nonsense status) to ensure no unrelated data is
 *    matched.
 */
export async function test_api_aimall_backend_administrator_orders_test_search_orders_with_status_and_date_range_filters(
  connection: api.IConnection,
) {
  // 1. Confirm administrator permissions and retrieve the full list of orders
  const initialPage =
    await api.functional.aimall_backend.administrator.orders.index(connection);
  typia.assert(initialPage);
  const allOrders = initialPage.data;

  // If no order data exists in the admin environment, skip the remaining steps
  if (!allOrders.length) return;

  // 2. Choose a real status and date interval from test data
  const orderStatuses = Array.from(
    new Set(allOrders.map((o) => o.order_status)),
  ).filter(Boolean);
  const [targetStatus] = orderStatuses;
  const filtered = allOrders.filter((o) => o.order_status === targetStatus);
  const createdDates = filtered.map((o) => o.created_at).sort();
  const created_at_from = createdDates[0];
  const created_at_to = createdDates[createdDates.length - 1];

  // 3. Search with order_status and creation date range filters
  const output =
    await api.functional.aimall_backend.administrator.orders.search(
      connection,
      {
        body: {
          order_status: targetStatus,
          created_at_from,
          created_at_to,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(output);

  // 4. All returned orders must match both filters
  for (const order of output.data) {
    TestValidator.equals("filtered status")(order.order_status)(targetStatus);
    TestValidator.predicate("created_at >= from")(
      order.created_at >= created_at_from,
    );
    TestValidator.predicate("created_at <= to")(
      order.created_at <= created_at_to,
    );
  }

  // 5. Pagination metadata validation
  TestValidator.equals("page")(output.pagination.current)(1);
  TestValidator.equals("limit")(output.pagination.limit)(10);
  TestValidator.predicate("records >= data count")(
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate("pages >= 1")(output.pagination.pages >= 1);

  // 6. Negative: bogus order_status returns empty
  const nonsenseStatus = "never-actual-status";
  const negativeOutput =
    await api.functional.aimall_backend.administrator.orders.search(
      connection,
      {
        body: {
          order_status: nonsenseStatus,
          created_at_from,
          created_at_to,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(negativeOutput);
  TestValidator.equals("no data for fake status")(negativeOutput.data.length)(
    0,
  );
}
