import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validates that an administrator can add a new order item to an open order.
 *
 * Business context: Administrators sometimes need to add or adjust items in
 * open orders, such as for corrections, customer requests, or post-order
 * modifications. This test ensures the administrator workflow for adding a new
 * order item is functioning correctly.
 *
 * Steps:
 *
 * 1. Create a new order using the administrator create endpoint, ensuring it is
 *    open (status 'pending').
 * 2. Add a new order item to this open order, supplying valid product and pricing
 *    data.
 * 3. Validate that the API returns an order item with matching details and correct
 *    parent linkage.
 *
 * (Note: The system does not provide an endpoint to list/retrieve all order
 * items for an order, so this verification is limited to the create/response
 * cycle.)
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_admin_add_new_order_item_to_open_order(
  connection: api.IConnection,
) {
  // 1. Create a new open order as administrator
  const orderCreateInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 0,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderCreateInput },
  );
  typia.assert(order);

  // 2. Add a new order item to the open order
  const itemInput: IAimallBackendOrderItem.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    product_option_id: null, // null, as allowed by schema
    item_name: "Test Product Item",
    quantity: 2,
    unit_price: 2500.0,
    total_price: 5000.0,
  };
  const orderItem =
    await api.functional.aimall_backend.administrator.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: itemInput,
      },
    );
  typia.assert(orderItem);

  // 3. Validate that the returned item matches our input and links to the right order
  TestValidator.equals("parent order matches")(orderItem.order_id)(order.id);
  TestValidator.equals("input product matches")(orderItem.product_id)(
    itemInput.product_id,
  );
  TestValidator.equals("option is null")(orderItem.product_option_id)(null);
  TestValidator.equals("item name matches")(orderItem.item_name)(
    itemInput.item_name,
  );
  TestValidator.equals("quantity matches")(orderItem.quantity)(
    itemInput.quantity,
  );
  TestValidator.equals("unit price matches")(orderItem.unit_price)(
    itemInput.unit_price,
  );
  TestValidator.equals("total price matches")(orderItem.total_price)(
    itemInput.total_price,
  );
}
