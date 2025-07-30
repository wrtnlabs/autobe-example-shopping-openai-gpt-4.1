import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that a seller can delete their own order item from an open order.
 *
 * This scenario validates that a seller (merchant) is able to remove an item
 * they previously added from one of their orders, provided the order is still
 * open (pending). This is a standard operation for order management workflows,
 * including correcting order composition before fulfillment.
 *
 * Steps:
 *
 * 1. Register a new seller using the admin endpoint with unique identifying
 *    details.
 * 2. Add a product belonging to that seller (using a random UUID for product
 *    category).
 * 3. Place a new order for that seller (simulate a buyer with a random UUID for
 *    customer and delivery address).
 * 4. Add a new order item to the order, referencing the created product.
 * 5. Delete the order item as the seller. Verify deletion succeeds by the absence
 *    of errors (no GET endpoint exists for order item verification).
 *
 * All references (UUIDs) are unique and random for test isolation. The order
 * item deletion is complete upon successful non-error execution of the delete
 * operation.
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_seller_deletes_own_order_item_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Add a product for this seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: "https://example.com/image.jpg",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Place a new order for the seller
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 123000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Add an order item to the order
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 2,
          unit_price: 123000,
          total_price: 246000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 5. Delete the order item as the seller
  await api.functional.aimall_backend.seller.orders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
    },
  );
  // Success is absence of error; deletion cannot be further validated without a GET endpoint.
}
