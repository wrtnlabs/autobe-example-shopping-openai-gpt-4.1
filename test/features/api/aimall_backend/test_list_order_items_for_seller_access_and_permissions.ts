import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Test that a seller can list all order items for an order they are assigned to
 * and validate access control and error cases.
 *
 * Business workflow:
 *
 * 1. Seller creates an order (using direct API call to simulate a seller context).
 * 2. Seller adds an order item to this order.
 * 3. Seller fetches all order items for the order, validates the expected order
 *    item is present.
 * 4. Attempt to fetch order items from an order not owned by this seller
 *    (different seller_id); expect an error.
 * 5. Attempt to fetch order items for an invalid orderId; expect error.
 *
 * Notes:
 *
 * - The test assumes the API connection grants seller permissions. No
 *   authentication APIs are defined, so only data simulation is possible.
 * - All error validation uses TestValidator.error without checking error message
 *   or type, complying with error assertion requirements.
 * - All APIs and DTOs used strictly align with project definitions.
 */
export async function test_api_aimall_backend_test_list_order_items_for_seller_access_and_permissions(
  connection: api.IConnection,
) {
  // 1. Seller creates an order
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const customer_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order_status = "pending";
  const currency = "KRW";
  const total_amount = 10000;
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id,
        seller_id,
        address_id,
        order_status,
        total_amount,
        currency,
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 2. Seller adds an order item
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const item_name = "Test Item";
  const quantity = 2;
  const unit_price = 5000;
  const total_price = quantity * unit_price;
  const created_item =
    await api.functional.aimall_backend.seller.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id,
          item_name,
          quantity,
          unit_price,
          total_price,
        } satisfies IAimallBackendOrderItem.ICreate,
      },
    );
  typia.assert(created_item);

  // 3. Seller fetches order items for their order and validates the created item is present
  const result =
    await api.functional.aimall_backend.seller.orders.orderItems.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(result);
  TestValidator.predicate("order item is listed")(
    result.data.some((x) => x.id === created_item.id),
  );

  // 4. Attempt to fetch order items from an order not owned by this seller
  const other_seller_id = typia.random<string & tags.Format<"uuid">>();
  const other_order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: other_seller_id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status,
        total_amount,
        currency,
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(other_order);
  await TestValidator.error("seller cannot access order they do not own")(() =>
    api.functional.aimall_backend.seller.orders.orderItems.index(connection, {
      orderId: other_order.id,
    }),
  );

  // 5. Attempt to fetch order items for an invalid (random) orderId
  await TestValidator.error("invalid orderId returns error")(() =>
    api.functional.aimall_backend.seller.orders.orderItems.index(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
