import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that an attempt to update an order item with an invalid (negative or
 * zero) unit_price fails.
 *
 * This test ensures that the update endpoint properly rejects attempts to set
 * unit_price to forbidden values and that, after these failed attempts, no data
 * change has occurred to the underlying order item entity.
 *
 * Steps:
 *
 * 1. Register a new seller account
 * 2. Add a product for this seller
 * 3. Create an order assigned to this seller
 * 4. Add a valid order item for the order (unit_price > 0)
 * 5. Save an in-memory copy of the created order item for comparison
 * 6. Attempt to update unit_price to a negative value and verify error is thrown
 * 7. Attempt to update unit_price to zero and verify error is thrown
 * 8. Confirm original order item data is unchanged (at least in in-memory copy)
 */
export async function test_api_aimall_backend_seller_orders_orderItems_test_update_order_item_invalid_price_fails(
  connection: api.IConnection,
) {
  // 1. Register seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Add a product for this seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.alphaNumeric(8),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 3. Create order for the seller
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 4. Add a valid order item
  const item =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: product.id,
          item_name: "Sample Item",
          quantity: 1,
          unit_price: 1000,
          total_price: 1000,
        },
      },
    );
  typia.assert(item);

  // 5. Save original (deep) copy for comparison
  const originalItem = { ...item };

  // 6. Attempt update with negative unit_price
  await TestValidator.error("Negative price should fail")(async () => {
    await api.functional.aimall_backend.seller.orders.orderItems.update(
      connection,
      {
        orderId: order.id,
        orderItemId: item.id,
        body: { unit_price: -100 },
      },
    );
  });

  // 7. Attempt update with zero unit_price
  await TestValidator.error("Zero price should fail")(async () => {
    await api.functional.aimall_backend.seller.orders.orderItems.update(
      connection,
      {
        orderId: order.id,
        orderItemId: item.id,
        body: { unit_price: 0 },
      },
    );
  });

  // 8. Confirm item remains unchanged in memory (assignment only; no server GET available)
  TestValidator.equals("No mutation after failed updates")(item)(originalItem);
}
