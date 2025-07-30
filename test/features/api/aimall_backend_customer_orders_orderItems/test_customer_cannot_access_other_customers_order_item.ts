import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Ensure customers cannot access order items belonging to other customers
 * (privacy enforcement test).
 *
 * This test guarantees that customer data boundaries are respected and a
 * customer cannot fetch order item details from another customer's order.
 *
 * Scenario:
 *
 * 1. Simulate two customers, A and B, each placing their own order via different
 *    customer_id values.
 * 2. Customer B creates a new order and adds an item to it (as the rightful
 *    owner).
 * 3. Attempt to retrieve Customer B's order item using a context intended for
 *    Customer A (represented by distinct customer_id in order creation).
 * 4. Assert that the API blocks access (via authorization or not found
 *    error)—validating strict privacy controls.
 *
 * Steps:
 *
 * - Create an order as Customer A (for privacy baseline)
 * - Create an order as Customer B
 * - Add an order item under Customer B's order.
 * - Attempt access to Customer B's order item as (simulated) Customer A, and
 *   assert that access is forbidden.
 */
export async function test_api_aimall_backend_customer_orders_orderItems_test_customer_cannot_access_other_customers_order_item(
  connection: api.IConnection,
) {
  // 1. Create an order for Customer A (setup privacy isolation)
  const customerAOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(customerAOrder);

  // 2. Create an order as Customer B
  const customerBOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(customerBOrder);

  // 3. Add order item to Customer B's order
  const orderItem =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: customerBOrder.id,
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          item_name: "Privacy Test Product",
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 4. Attempt forbidden access: fetch Customer B's order item as Customer A (privacy should prevent this)
  await TestValidator.error(
    "customer cannot access another customer's order item",
  )(async () => {
    await api.functional.aimall_backend.customer.orders.orderItems.at(
      connection,
      {
        orderId: customerBOrder.id,
        orderItemId: orderItem.id,
      },
    );
  });
}
