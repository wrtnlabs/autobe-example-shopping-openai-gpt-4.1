import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate retrieving full order details by orderId as administrator.
 *
 * This test verifies that an administrator can:
 *
 * 1. List all orders and select a valid orderId.
 * 2. Fetch details for that orderId and confirm all atomic fields and
 *    relationships (e.g., customer, address, status, total amount) are properly
 *    returned.
 * 3. Attempt to fetch an order using a non-existent UUID and receive a 404 error.
 *
 * This covers both successful and failure scenarios, checking field
 * completeness, typing, and error handling as required for administrative order
 * detail retrieval.
 */
export async function test_api_aimall_backend_administrator_orders_test_get_order_details_valid_id(
  connection: api.IConnection,
) {
  // 1. List available orders as administrator (dependency)
  const orderPage =
    await api.functional.aimall_backend.administrator.orders.index(connection);
  typia.assert(orderPage);

  // 2. If any orders exist, select a valid orderId for detail query
  if (orderPage.data.length > 0) {
    const order = orderPage.data[0];

    // 3. Retrieve order details using the orderId
    const details = await api.functional.aimall_backend.administrator.orders.at(
      connection,
      {
        orderId: order.id,
      },
    );
    typia.assert(details);
    // Core field assertions
    TestValidator.equals("order.id")(details.id)(order.id);
    TestValidator.predicate("order_number is not empty")(
      typeof details.order_number === "string" &&
        details.order_number.length > 0,
    );
    TestValidator.predicate("order_status is not empty")(
      typeof details.order_status === "string" &&
        details.order_status.length > 0,
    );
    TestValidator.predicate("valid total_amount")(
      typeof details.total_amount === "number" && details.total_amount >= 0,
    );
    TestValidator.predicate("valid currency")(
      typeof details.currency === "string" && details.currency.length > 0,
    );
    TestValidator.predicate("has customer_id")(
      typeof details.customer_id === "string" && details.customer_id.length > 0,
    );
    TestValidator.predicate("has seller_id")(
      typeof details.seller_id === "string" && details.seller_id.length > 0,
    );
    TestValidator.predicate("has address_id")(
      typeof details.address_id === "string" && details.address_id.length > 0,
    );
  }

  // 4. Retrieve a non-existent orderId and ensure 404 error
  await TestValidator.error("404 for non-existent orderId")(async () => {
    await api.functional.aimall_backend.administrator.orders.at(connection, {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
