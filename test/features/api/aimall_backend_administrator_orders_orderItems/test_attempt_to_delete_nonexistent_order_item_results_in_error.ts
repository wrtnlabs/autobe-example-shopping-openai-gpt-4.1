import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validates that attempting to delete a non-existent order item from an order
 * throws the correct error.
 *
 * Business Context: In an e-commerce backend, administrators must not be able
 * to remove order items that do not exist, ensuring data integrity and correct
 * audit trail handling for order operations. This test checks that the API
 * responds properly to invalid deletion attempts.
 *
 * Steps:
 *
 * 1. Create a product with minimal required fields to enable it for use in an
 *    order.
 * 2. Create an order with required fields (customer_id, seller_id, address_id,
 *    order_status, total_amount, and currency).
 * 3. Add a valid order item for the order using the product just created. Validate
 *    the order item was created successfully.
 * 4. Attempt to delete an order item using the correct order_id but a deliberately
 *    non-existent order_item_id. This should NOT delete anything and should
 *    result in an error (not found or similar).
 * 5. Validate that the error is indeed thrown and the status is correct for not
 *    found (or relevant database error condition).
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_attempt_to_delete_nonexistent_order_item_results_in_error(
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
          title: RandomGenerator.paragraph()(),
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
        total_amount: 1000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Add a valid order item
  const orderItem =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: product.title,
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(orderItem);
  TestValidator.equals("order id matches")(orderItem.order_id)(order.id);

  // 4. Attempt deletion with non-existent orderItemId
  const fakeOrderItemId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.notEquals("UUID must be different")(fakeOrderItemId)(
    orderItem.id,
  );

  await TestValidator.error("non-existent order item deletion should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.erase(
        connection,
        {
          orderId: order.id,
          orderItemId: fakeOrderItemId,
        },
      );
    },
  );
}
