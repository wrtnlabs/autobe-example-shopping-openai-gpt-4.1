import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * A seller can view the details of an order item on their own order.
 *
 * This test verifies that when a seller creates an order and adds an item to
 * it, they can retrieve that specific order item and the response matches what
 * was created, proving authorization and data correctness. All required
 * business properties (order and item) are set and the returned fields are
 * validated for integrity.
 *
 * Process:
 *
 * 1. Create a new order as seller (POST /aimall-backend/seller/orders)
 * 2. Add an order item to this order (POST
 *    /aimall-backend/seller/orders/:orderId/orderItems)
 * 3. Retrieve the order item's details (GET
 *    /aimall-backend/seller/orders/:orderId/orderItems/:orderItemId)
 * 4. Validate all major fields, including ownership (order_id matches),
 *    correctness of line data, and schema conformance
 */
export async function test_api_aimall_backend_test_seller_view_own_order_item_success(
  connection: api.IConnection,
) {
  // 1. Create a new order as the seller
  const orderCreate: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 55000,
    currency: "KRW",
    order_number: `ORD-${new Date().toISOString().split("T")[0].replace(/-/g, "")}-0001`,
  };
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);

  // 2. Add an order item to the order
  const itemCreate: IAimallBackendOrderItem.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    product_option_id: null,
    item_name: "Test Item A",
    quantity: 3,
    unit_price: 16500,
    total_price: 49500,
  };
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: itemCreate,
      },
    );
  typia.assert(orderItem);

  // 3. Ask for the details of the order item
  const detail =
    await api.functional.aimall_backend.seller.orders.orderItems.at(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  typia.assert(detail);

  // 4. Validate response correctness and field mapping
  TestValidator.equals("orderId matches")(detail.order_id)(order.id);
  TestValidator.equals("orderItemId matches")(detail.id)(orderItem.id);
  TestValidator.equals("item_name matches")(detail.item_name)(
    itemCreate.item_name,
  );
  TestValidator.equals("quantity matches")(detail.quantity)(
    itemCreate.quantity,
  );
  TestValidator.equals("unit_price matches")(detail.unit_price)(
    itemCreate.unit_price,
  );
  TestValidator.equals("total_price matches")(detail.total_price)(
    itemCreate.total_price,
  );
}
