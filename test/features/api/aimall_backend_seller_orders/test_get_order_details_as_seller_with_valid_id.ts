import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that a seller can retrieve their own order details by orderId and
 * cannot access orders not belonging to them or nonexistent orders.
 *
 * Business context: Sellers should be able to access only the orders they are
 * authorized for (their own orders). This test ensures proper backend
 * authorization and scoping on order detail retrieval.
 *
 * Steps:
 *
 * 1. Fetch the list of orders for the current seller using the seller order list
 *    endpoint.
 * 2. Select a valid orderId from the seller's own orders (ensure at least one
 *    order exists).
 * 3. Fetch the order details with that orderId and validate all fields.
 * 4. Negative scenario: Attempt to fetch a non-existent orderId to verify that a
 *    404 or error is triggered.
 *
 * Negative case involving a different seller is omitted as there are no user
 * registration/authentication APIs in the provided context.
 */
export async function test_api_aimall_backend_seller_orders_test_get_order_details_as_seller_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Fetch the list of orders for the current seller
  const orderList =
    await api.functional.aimall_backend.seller.orders.index(connection);
  typia.assert(orderList);
  TestValidator.predicate("seller's order list is not empty")(
    Array.isArray(orderList.data) && orderList.data.length > 0,
  );

  // 2. Select a valid orderId from the results
  const order = orderList.data[0];

  // 3. Fetch order details by id
  const orderDetails = await api.functional.aimall_backend.seller.orders.at(
    connection,
    {
      orderId: order.id,
    },
  );
  typia.assert(orderDetails);
  TestValidator.equals("order id matches")(orderDetails.id)(order.id);
  TestValidator.equals("seller id matches")(orderDetails.seller_id)(
    order.seller_id,
  );
  TestValidator.equals("order number matches")(orderDetails.order_number)(
    order.order_number,
  );
  TestValidator.equals("order status matches")(orderDetails.order_status)(
    order.order_status,
  );
  TestValidator.equals("total amount matches")(orderDetails.total_amount)(
    order.total_amount,
  );
  TestValidator.equals("currency matches")(orderDetails.currency)(
    order.currency,
  );
  TestValidator.equals("customer id matches")(orderDetails.customer_id)(
    order.customer_id,
  );
  TestValidator.equals("address id matches")(orderDetails.address_id)(
    order.address_id,
  );
  TestValidator.equals("created_at matches")(orderDetails.created_at)(
    order.created_at,
  );
  TestValidator.equals("updated_at matches")(orderDetails.updated_at)(
    order.updated_at,
  );
  TestValidator.equals("archived_at matches")(orderDetails.archived_at)(
    order.archived_at ?? null,
  );

  // 4. Negative scenario: Fetch non-existent order (random uuid)
  await TestValidator.error("fetching nonexistent order should throw")(() =>
    api.functional.aimall_backend.seller.orders.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
