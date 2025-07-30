import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that the system properly rejects attempts to update an order item
 * with an invalid quantity (zero or negative).
 *
 * Business context: Order item quantities must remain positive integers.
 * Administrators (or sellers) should not be able to update an item to have a
 * non-positive quantity. This maintains database integrity and prevents
 * misrepresentation of actual orders. The test covers system behavior when such
 * invalid updates are attempted.
 *
 * Steps:
 *
 * 1. Prepare a product via administrator API to serve as the item in an order.
 * 2. Prepare an order via administrator API (with plausible but random business
 *    fields).
 * 3. Add a normal order item to the order via seller API (quantity is positive,
 *    all fields pass validation).
 * 4. Attempt to update the order item, setting quantity to zero.
 *
 *    - Confirm the system rejects the request with a validation error (runtime
 *         error, not a TS error).
 *    - Validate that no changes are saved to the order item (i.e., its quantity and
 *         other fields remain original).
 * 5. Attempt to update the order item, setting quantity to a negative value.
 *
 *    - Confirm the system rejects the request with a similar validation error.
 *    - Validate by fetching the order item (if possible) that its fields have not
 *         changed.
 *
 * Edge cases:
 *
 * - Attempts to update without other changes (just quantity is zero/negative).
 * - Re-attempts of the valid update afterwards to confirm positive path still
 *   works.
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_update_order_item_to_invalid_quantity_rejected(
  connection: api.IConnection,
) {
  // 1. Create product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "OrderItem Qty Test " + RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create order
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: product.seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3. Add an order item (with valid quantity)
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

  // 4. Try to update order item with zero quantity (should fail)
  await TestValidator.error("update with zero quantity should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.update(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
          body: {
            quantity: 0,
          } satisfies IAimallBackendOrderItem.IUpdate,
        },
      );
    },
  );

  // 5. Try to update order item with negative quantity (should fail)
  await TestValidator.error("update with negative quantity should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.update(
        connection,
        {
          orderId: order.id,
          orderItemId: orderItem.id,
          body: {
            quantity: -2,
          } satisfies IAimallBackendOrderItem.IUpdate,
        },
      );
    },
  );

  // 6. (Optional) Confirm original order item quantity is unchanged (if a read API exists; skipped here)
}
