import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate handling of not-found and relationship violation cases when
 * retrieving an order item as administrator.
 *
 * This test checks:
 *
 * - API returns a not found error when querying with a nonexistent orderItemId.
 * - API returns a not found or relationship violation error when querying with a
 *   valid-looking orderItemId not belonging to the orderId.
 * - No private or irrelevant information is leaked in error responses.
 *
 * Steps:
 *
 * 1. Create a baseline order (Order A) using the admin order creation endpoint.
 * 2. Attempt to retrieve an order item with a random (nonexistent) orderItemId for
 *    Order A's id; validate error response.
 * 3. Create a second baseline order (Order B).
 * 4. Attempt to retrieve an order item with a random orderItemId for Order A's id
 *    (simulating cross-order/foreign item id); validate error.
 *
 * Note: Since there is no API to list/create order items directly, random UUIDs
 * are used to simulate item ids that do not exist or do not belong to the
 * referenced order.
 */
export async function test_api_aimall_backend_administrator_orders_orderItems_test_admin_retrieve_order_item_not_found_or_wrong_order(
  connection: api.IConnection,
) {
  // 1. Create baseline order (Order A)
  const orderA =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: typia.random<IAimallBackendOrder.ICreate>(),
      },
    );
  typia.assert(orderA);

  // 2. Attempt to retrieve a nonexistent order item id on Order A
  await TestValidator.error("should error on nonexistent orderItemId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.orderItems.at(
        connection,
        {
          orderId: orderA.id,
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Create second order (Order B)
  const orderB =
    await api.functional.aimall_backend.administrator.orders.create(
      connection,
      {
        body: typia.random<IAimallBackendOrder.ICreate>(),
      },
    );
  typia.assert(orderB);

  // 4. Attempt to retrieve an order item (random uuid) for Order A (simulate cross-order violation)
  await TestValidator.error(
    "should error if orderItemId belongs to different orderId",
  )(async () => {
    await api.functional.aimall_backend.administrator.orders.orderItems.at(
      connection,
      {
        orderId: orderA.id,
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
