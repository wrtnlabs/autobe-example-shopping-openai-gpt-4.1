import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that a seller can successfully update an order item for an order
 * they own.
 *
 * This test follows the real workflow for verifying seller order item update
 * functionality:
 *
 * 1. Register a new seller using the administrator API (simulates onboarding &
 *    downstream assignment of order ownership).
 * 2. Create a product assigned to this seller (admin privilege)
 * 3. Create an order assigned to this seller (admin privilege)
 * 4. Add an order item for the created order (seller privilege)
 * 5. Update the order item via the seller API, changing the quantity and price
 * 6. Verify the changes are persisted and the returned order item matches expected
 *    values
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_seller_updates_own_order_item_successfully(
  connection: api.IConnection,
) {
  // 1. Register a seller
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

  // 2. Register a product for this seller
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: categoryId,
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create an order assigned to the seller
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Add order item for the order (as seller)
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

  // 5. Update the order item (change quantity and price)
  const updatedOrderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.update(
      connection,
      {
        orderId: order.id,
        orderItemId: orderItem.id,
        body: {
          quantity: 2,
          unit_price: 12000,
          total_price: 2 * 12000,
        } satisfies IAimallBackendOrderItem.IUpdate,
      },
    );
  typia.assert(updatedOrderItem);

  // 6. Check that fields changed as expected
  TestValidator.equals("quantity updated")(updatedOrderItem.quantity)(2);
  TestValidator.equals("unit_price updated")(updatedOrderItem.unit_price)(
    12000,
  );
  TestValidator.equals("total_price updated")(updatedOrderItem.total_price)(
    24000,
  );
}
