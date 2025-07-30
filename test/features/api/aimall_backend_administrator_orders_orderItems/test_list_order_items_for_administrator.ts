import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate administrator listing of order items for a particular order.
 *
 * This test ensures that an administrator can retrieve the full list of order
 * items for a specific order via the order items listing endpoint. It also
 * checks schema compliance and correct key references, and verifies API
 * behavior for a missing order.
 *
 * Steps:
 *
 * 1. Create a minimal order as administrator (mock UUIDs for customer, seller, and
 *    address)
 * 2. Add an order item to the order (supplying product and option UUIDs with valid
 *    item data)
 * 3. List all items for the order and verify:
 *
 *    - The created item is present
 *    - Each record matches schema
 *    - All key references (order_id, product_id, etc.) are as expected
 * 4. Attempt to list items for a random non-existent order (should error)
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_index(
  connection: api.IConnection,
) {
  // 1. Create a new order with required fields; system will assign PK
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id,
        address_id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Add one order item to created order (could be extended for multiple)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const product_option_id = typia.random<string & tags.Format<"uuid">>();
  const orderItemInput = {
    product_id,
    product_option_id,
    item_name: "Test Product Option",
    quantity: 2,
    unit_price: 5000,
    total_price: 10000,
  } satisfies IAimallBackendOrderItem.ICreate;
  const createdItem =
    await api.functional.aimall_backend.administrator.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemInput,
      },
    );
  typia.assert(createdItem);
  TestValidator.equals("created item order id")(createdItem.order_id)(order.id);

  // 3. List order items for this order, validate
  const itemsPage =
    await api.functional.aimall_backend.administrator.orders.orderItems.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(itemsPage);
  TestValidator.predicate("should include created item")(
    itemsPage.data.some((item) => item.id === createdItem.id),
  );
  for (const item of itemsPage.data) {
    typia.assert<IAimallBackendOrderItem>(item);
    TestValidator.equals("order_id matches")(item.order_id)(order.id);
  }

  // 4. Error case: missing order id
  await TestValidator.error("should not find items for fake orderId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
