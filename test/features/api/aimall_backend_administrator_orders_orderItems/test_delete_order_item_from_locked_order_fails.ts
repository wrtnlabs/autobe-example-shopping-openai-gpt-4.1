import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that deletion of an order item from a finalized order fails.
 *
 * This test simulates an administrator attempting to delete an order item from
 * an order that has been locked/finalized, such as delivered. The expectation
 * is that the system enforces business rules and prevents such deletions,
 * returning an appropriate error.
 *
 * Steps:
 *
 * 1. Create a product as admin, for order item creation.
 * 2. Create an order as admin.
 * 3. Add an order item to the order as seller (since only the seller endpoint
 *    exists for adding).
 * 4. Update the order (as admin) to status 'delivered' to simulate a
 *    finalized/locked order state.
 * 5. Attempt to delete the order item as admin using the administrator endpoint.
 *    Verify that this fails with an error (business rule violation).
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_delete_order_item_from_locked_order_fails(
  connection: api.IConnection,
) {
  // 1. Create product as admin
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create order as admin
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 12000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Add order item to the order as seller
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 2,
          unit_price: 6000,
          total_price: 12000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 4. Update order status to 'delivered' using admin endpoint
  const updatedOrder =
    await api.functional.aimall_backend.administrator.orders.update(
      connection,
      {
        orderId: order.id,
        body: {
          order_status: "delivered",
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendOrder.IUpdate,
      },
    );
  typia.assert(updatedOrder);
  TestValidator.equals("order is delivered")(updatedOrder.order_status)(
    "delivered",
  );

  // 5. Attempt to delete the order item as admin. This should fail.
  await TestValidator.error("Cannot delete order item from delivered order")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
        },
      );
    },
  );
}
