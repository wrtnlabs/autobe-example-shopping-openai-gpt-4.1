import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test the administrator's ability to delete an order item from an open order.
 *
 * This test ensures that an admin user can remove a line item from an existing
 * open order. It covers the full business context:
 *
 * - Confirming precondition: an order exists and is open
 * - An order item exists for the order
 * - Deletion occurs via the admin endpoint
 * - (Postcondition: the order item would be gone, but as there is no endpoint to
 *   confirm in this suite, we skip)
 *
 * Step-by-step procedure:
 *
 * 1. Create a product (admin, so no seller login required)
 * 2. Create an order (admin, attaches the product's seller)
 * 3. Add an order item to the order (seller endpoint for item creation)
 * 4. Delete the order item (admin endpoint) (5. If/when a retrieval API is given,
 *    confirm deletion and order total correctness)
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_eraseByOrderidAndOrderitemid(
  connection: api.IConnection,
) {
  // 1. Create a product to later attach as an order item
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(3),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. Create the order (with product's seller)
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: product.seller_id,
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 1000, // Placeholder; order total isn't recalculated in this test
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 3. Add an order item to the order (as a seller, per API design)
  const orderItemInput: IAimallBackendOrderItem.ICreate = {
    product_id: product.id,
    product_option_id: null,
    item_name: product.title,
    quantity: 3,
    unit_price: 100,
    total_price: 300,
  };
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      { orderId: order.id, body: orderItemInput },
    );
  typia.assert(orderItem);

  // 4. Delete the order item using administrator privilege
  await api.functional.aimall_backend.administrator.orders.orderItems.erase(
    connection,
    {
      orderId: order.id,
      orderItemId: orderItem.id,
    },
  );

  // (5. No retrieval endpoint for order items; would confirm deletion if present)
}
