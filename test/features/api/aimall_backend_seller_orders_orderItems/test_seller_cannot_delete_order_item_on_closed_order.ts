import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that sellers cannot delete order items from finalized (closed)
 * orders.
 *
 * This scenario simulates a real business case where, to maintain financial and
 * shipping integrity, order items on closed orders must not be deleted by
 * sellers. It exercises the code path that enforces this crucial business
 * rule.
 *
 * Step-by-step process:
 *
 * 1. Create a seller account (as admin)
 * 2. Seller registers a new product
 * 3. Seller creates a new order (for test, we randomize a customer UUID/address.)
 * 4. Seller adds an order item to the order
 * 5. Seller closes/finalizes the order by changing status to a closed state (e.g.
 *    'closed' or 'completed')
 * 6. Seller attempts to delete the order item – EXPECT an error (deletion should
 *    be prevented)
 *
 * This test passes if (and only if) the API returns an error on the delete
 * operation after order is finalized.
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_seller_cannot_delete_order_item_on_closed_order(
  connection: api.IConnection,
) {
  // 1. Create a seller account (admin scope action)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: RandomGenerator.alphabets(10) + "@example.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Seller registers a new product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()(1)(1),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Seller creates a new order (mock customer and address for test)
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id: seller.id,
        address_id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Seller adds an order item to the order
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 1,
          unit_price: 10000,
          total_price: 10000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 5. Seller closes/finalizes the order
  const closedOrder = await api.functional.aimall_backend.seller.orders.update(
    connection,
    {
      orderId: order.id,
      body: {
        order_status: "closed",
        updated_at: new Date().toISOString(),
      } satisfies IAimallBackendOrder.IUpdate,
    },
  );
  typia.assert(closedOrder);
  TestValidator.equals("order_status is closed")(closedOrder.order_status)(
    "closed",
  );

  // 6. Seller attempts to delete the order item from a closed order
  //    This must fail and throw a business logic error
  await TestValidator.error(
    "Seller cannot delete order item from a finalized order",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.orderItems.erase(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
      },
    );
  });
}
