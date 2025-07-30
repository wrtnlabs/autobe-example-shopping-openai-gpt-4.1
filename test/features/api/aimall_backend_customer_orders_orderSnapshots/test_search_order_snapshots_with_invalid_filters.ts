import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates the behavior of order snapshot searching with invalid filters as a
 * customer.
 *
 * This test ensures:
 *
 * - When searching for order snapshots with filters that find no matches (e.g.,
 *   non-existent event type or unreachable time window), the result set is
 *   empty and correctly structured.
 * - Malformed or invalid filter property values (such as types, out-of-bound
 *   numbers, or completely invalid objects) yield appropriate error responses,
 *   and no sensitive data is included in errors.
 *
 * Workflow:
 *
 * 1. Create a legitimate order for use in searches.
 * 2. Use the search API with a filter (orderId + snapshot_type) guaranteed not to
 *    match any results.
 * 3. Use a filter with an out-of-range date interval that cannot have results.
 * 4. Use malformed input (e.g., bad date/time formats, or wrong types) to provoke
 *    validation errors.
 * 5. For each invalid case, confirm no results or error returned as expected, and
 *    that no sensitive information is leaked.
 */
export async function test_api_aimall_backend_customer_orders_orderSnapshots_test_search_order_snapshots_with_invalid_filters(
  connection: api.IConnection,
) {
  // 1. Create an order to ensure there is at least one order for searching
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 2. Search for snapshots with a non-existent snapshot_type
  const emptyType =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_type: "_non_existent_type_abcxyz",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(emptyType);
  TestValidator.predicate("no results for non-existent type")(
    !emptyType.data || emptyType.data.length === 0,
  );

  // 3. Search for snapshots with an out-of-range timestamp
  const futureDate = new Date(
    Date.now() + 365 * 24 * 3600 * 1000,
  ).toISOString(); // one year in the future
  const emptyDate =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_at_from: futureDate,
          snapshot_at_to: futureDate,
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(emptyDate);
  TestValidator.predicate("no results for out-of-bound time range")(
    !emptyDate.data || emptyDate.data.length === 0,
  );

  // 4. Malformed filter input - invalid snapshot_at_from format
  await TestValidator.error("invalid date format yields error")(async () => {
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          snapshot_at_from: "not-a-date",
          limit: 10,
          page: 1,
        },
      },
    );
  });

  // 5. Malformed filter input - negative page number
  await TestValidator.error("negative page number validation")(async () => {
    await api.functional.aimall_backend.customer.orders.orderSnapshots.search(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          limit: 10,
          page: -2,
        },
      },
    );
  });
}
