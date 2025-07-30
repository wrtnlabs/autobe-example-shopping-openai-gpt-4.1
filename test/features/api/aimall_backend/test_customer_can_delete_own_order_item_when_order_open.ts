import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that a customer can delete an order item from their own order when
 * the order is still open/mutable.
 *
 * Purpose: This test ensures that a customer can remove an item from their own
 * order before finalization (e.g., while order status is 'pending'). The action
 * should succeed, and subsequent order info should reflect the item removal if
 * downstream APIs exist.
 *
 * Steps:
 *
 * 1. Register a new customer
 * 2. Create a product (must specify seller/category)
 * 3. Create a new order for the customer referencing seller and random address
 * 4. Add an order item to the created order for the given product
 * 5. Delete the order item
 * 6. (If supported in API: verify item deletion via fetch, but no such endpoint in
 *    current SDK)
 *
 * Limitation:
 *
 * - The test cannot verify post-delete state (e.g., that the item is really gone)
 *   because the SDK offers no GET endpoint for order item or order details. The
 *   test validates only that deletion call succeeds.
 */
export async function test_api_aimall_backend_test_customer_can_delete_own_order_item_when_order_open(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a product (must specify seller/category; use generated UUIDs)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product",
          description: "E2E Test product",
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create order referencing the registered customer and product's seller (satisfy foreign keys)
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 12345,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Add an order item to the order referencing real product
  const orderItem =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          product_option_id: null,
          item_name: product.title,
          quantity: 1,
          unit_price: 12345,
          total_price: 12345,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);

  // 5. Delete the order item
  await api.functional.aimall_backend.customer.orders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
    },
  );
  // 6. No API to further confirm the item is gone; deletion success = test passes.
}
