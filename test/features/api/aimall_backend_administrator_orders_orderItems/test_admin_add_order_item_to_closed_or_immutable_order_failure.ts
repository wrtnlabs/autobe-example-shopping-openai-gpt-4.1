import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validates that administrators cannot add order items to finalized, delivered,
 * or archived (immutable) orders.
 *
 * This test ensures that the API enforces business rules which disallow
 * modifications to orders in immutable states. Administrators can only add
 * order items to open/mutable orders.
 *
 * Steps:
 *
 * 1. Create a new order (mutable state, e.g., 'pending').
 * 2. Simulate moving the order to an immutable state ('delivered' + non-null
 *    archived_at) by locally mutating object (no update endpoint is available
 *    in the exposed API; so this is a best-effort simulation).
 * 3. Attempt to add an order item to this immutable order—expect the API to reject
 *    with a validation/business rule error.
 * 4. As a sanity check, verify that adding an order item to a fresh, open order
 *    does succeed.
 *
 * Limitations: Since the current test infrastructure does not expose any order
 * status update endpoints (PUT), order state mutation is simulated by locally
 * modifying the retrieved order object. Thus, the failure case is limited to
 * what the test can simulate, not a true E2E transition. If/when SDK supports
 * state-changing endpoints, this test should be revised to cover the real
 * workflow.
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_admin_add_order_item_to_closed_or_immutable_order_failure(
  connection: api.IConnection,
) {
  // 1. Create an order (mutable state, status=pending)
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Simulate locally that the order is immutable: delivered + archived
  // (We cannot call an update endpoint, so this must be local simulation)
  const immutableOrderId = order.id;
  order.order_status = "delivered"; // set as delivered
  order.archived_at = new Date().toISOString(); // set archived at to now

  // 3. Attempt to add order item to immutable order (should fail)
  const itemInput = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    item_name: "Sample Archived Product",
    quantity: 1,
    unit_price: 1000,
    total_price: 1000,
  } satisfies IAimallBackendOrderItem.ICreate;

  await TestValidator.error("should reject item addition on immutable order")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.create(
        connection,
        {
          orderId: immutableOrderId,
          body: itemInput,
        },
      );
    },
  );

  // 4. Sanity check: Can add item to a fresh pending order
  const order2 =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          total_amount: 5000,
          currency: "KRW",
        } satisfies IAimallBackendOrder.ICreate,
      },
    );
  typia.assert(order2);

  const goodItem = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    item_name: "Sample Item",
    quantity: 2,
    unit_price: 500,
    total_price: 1000,
  } satisfies IAimallBackendOrderItem.ICreate;

  const createdItem =
    await api.functional.aimall_backend.administrator.orders.orderItems.create(
      connection,
      {
        orderId: order2.id,
        body: goodItem,
      },
    );
  typia.assert(createdItem);
}
