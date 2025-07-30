import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderSnapshot";

/**
 * Validate retrieval of order snapshots when no snapshots exist for an order.
 *
 * This test covers the edge case where a customer has just created an order,
 * but no business events have triggered snapshot generation yet. It confirms
 * the API returns an empty list (not an error) for snapshot requests in this
 * state.
 *
 * Steps:
 *
 * 1. Provision a customer order using /aimall-backend/customer/orders
 * 2. Immediately invoke /aimall-backend/customer/orders/{orderId}/orderSnapshots
 * 3. Validate the returned page contains no snapshot data, and no errors occur.
 */
export async function test_api_aimall_backend_customer_orders_ordersnapshots_test_get_order_snapshots_for_order_with_no_snapshots(
  connection: api.IConnection,
) {
  // Step 1: Provision a customer order (do not create any snapshots)
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 9900,
    currency: "KRW",
  };
  const createdOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: orderInput,
    });
  typia.assert(createdOrder);

  // Step 2: Immediately list order snapshots for this new order
  const page =
    await api.functional.aimall_backend.customer.orders.orderSnapshots.index(
      connection,
      {
        orderId: createdOrder.id,
      },
    );
  typia.assert(page);

  // Step 3: Assert there is no data (no snapshots)
  TestValidator.predicate("no snapshots exist for new order")(
    !page.data || (Array.isArray(page.data) && page.data.length === 0),
  );
}
