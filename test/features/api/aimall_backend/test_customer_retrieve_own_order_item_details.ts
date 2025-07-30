import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate retrieval of a specific order item by a customer, ensuring all
 * detail fields and relationships are correct.
 *
 * Business context:
 *
 * - Customers must be able to view the complete details of items within their
 *   orders, including quantity, unit price snapshots, and correct item
 *   naming/snapping for audit/legal compliance.
 * - This test ensures that once an order and order item are created, the API
 *   returns correct and complete information for that item and enforces
 *   ownership/relationship logic.
 *
 * Step-by-step process:
 *
 * 1. Create a new IAimallBackendOrder as a simulated customer (assume connection
 *    context = valid authenticated customer)
 * 2. Add a single IAimallBackendOrderItem to the order using the
 *    .orderItems.create endpoint
 * 3. Retrieve the same order item via .orderItems.at using orderId and orderItemId
 * 4. Assert that the retrieved item matches the creation data: all fields,
 *    ownership linkage (order_id), and data integrity
 * 5. Validate the order and item relationship: order_id must match, total_price =
 *    quantity * unit_price, and item_name/ids are preserved
 */
export async function test_api_aimall_backend_test_customer_retrieve_own_order_item_details(
  connection: api.IConnection,
) {
  // 1. Create a new order for the customer
  const orderInput = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 25000,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;
  const createdOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: orderInput,
    });
  typia.assert(createdOrder);

  // 2. Add one order item to the order
  const itemInput = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    item_name: "Sample Product Name",
    quantity: 2,
    unit_price: 10000,
    total_price: 20000,
  } satisfies IAimallBackendOrderItem.ICreate;
  const createdItem =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: createdOrder.id,
        body: itemInput,
      },
    );
  typia.assert(createdItem);

  // 3. Retrieve the order item by ID
  const retrievedItem =
    await api.functional.aimall_backend.customer.orders.orderItems.at(
      connection,
      {
        orderId: createdOrder.id,
        orderItemId: createdItem.id,
      },
    );
  typia.assert(retrievedItem);

  // 4. Assert that all fields match what was created
  TestValidator.equals("order item id")(retrievedItem.id)(createdItem.id);
  TestValidator.equals("order relation")(retrievedItem.order_id)(
    createdOrder.id,
  );
  TestValidator.equals("product id")(retrievedItem.product_id)(
    itemInput.product_id,
  );
  TestValidator.equals("item name")(retrievedItem.item_name)(
    itemInput.item_name,
  );
  TestValidator.equals("quantity")(retrievedItem.quantity)(itemInput.quantity);
  TestValidator.equals("unit price")(retrievedItem.unit_price)(
    itemInput.unit_price,
  );
  TestValidator.equals("total price")(retrievedItem.total_price)(
    itemInput.total_price,
  );
  // 5. Relation integrity: check total_price = quantity * unit_price
  TestValidator.equals("total is qty * unit price")(retrievedItem.total_price)(
    retrievedItem.quantity * retrievedItem.unit_price,
  );
}
