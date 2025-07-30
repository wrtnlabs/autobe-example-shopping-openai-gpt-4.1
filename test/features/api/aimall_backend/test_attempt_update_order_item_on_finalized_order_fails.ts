import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test update rejection of order items on finalized orders (administrator
 * endpoint).
 *
 * This test ensures that if an order is in an immutable state such as
 * 'delivered' or archived, the system will reject update attempts to its order
 * items via the administrator endpoint. It simulates a real-world sequence:
 *
 * 1. Create a product (admin privilege).
 * 2. Create an order (with references to customer, seller, and address) in an
 *    initial status.
 * 3. Add an order item via the seller endpoint referencing that product, using a
 *    realistic item name and price.
 * 4. Finalize the order by setting its status to an immutable value (e.g.
 *    'delivered').
 * 5. Attempt to update the order item using the administrator endpoint (e.g.
 *    change item_name or quantity).
 * 6. System must throw an error and the item must not be updated.
 *
 * This covers enforcement of immutability rules at update endpoints as per
 * business policy.
 */
export async function test_api_aimall_backend_test_attempt_update_order_item_on_finalized_order_fails(
  connection: api.IConnection,
) {
  // 1. Create a product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product " + RandomGenerator.alphabets(5),
          description: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create an order
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 20000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Add an order item
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 2,
          unit_price: 10000,
          total_price: 20000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 4. Finalize/change the order status to 'delivered' (an immutable state)
  const deliveredOrder =
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
  typia.assert(deliveredOrder);
  TestValidator.equals("order is delivered")(deliveredOrder.order_status)(
    "delivered",
  );

  // 5. Attempt to update the order item on a finalized order (should fail)
  await TestValidator.error("update on a delivered order item should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.update(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
          body: {
            item_name: orderItem.item_name + " - updated",
            quantity: 5,
          } satisfies IAimallBackendOrderItem.IUpdate,
        },
      );
    },
  );
}
