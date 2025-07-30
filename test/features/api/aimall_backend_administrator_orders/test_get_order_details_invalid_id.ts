import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate error handling for order details fetch with invalid or non-existent
 * orderId.
 *
 * Business context: When an admin attempts to fetch an order by ID, passing a
 * UUID that does not point to an order, the system must return 404 Not Found
 * without leaking sensitive information. Similarly, malformed (non-UUID) input
 * should result in validation error, but per type safety restrictions, only the
 * non-existent but valid UUID case is implemented here.
 *
 * Step-by-step:
 *
 * 1. Generate a random valid UUID (syntactically valid but not linked to any
 *    order).
 * 2. Attempt to fetch order details with this orderId; expect a 404 Not Found
 *    error.
 * 3. Assert the error is thrown and no sensitive/internal info is exposed (system
 *    only checks error occurrence).
 */
export async function test_api_aimall_backend_administrator_orders_test_get_order_details_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a syntactically correct, but non-existent, orderId
  const nonExistentOrderId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Attempt to retrieve non-existent order; expect 404 error.
  await TestValidator.error("404 on non-existent orderId")(async () => {
    await api.functional.aimall_backend.administrator.orders.at(connection, {
      orderId: nonExistentOrderId,
    });
  });
  // Cannot test malformed UUID (type system will fail before request is made)
}
