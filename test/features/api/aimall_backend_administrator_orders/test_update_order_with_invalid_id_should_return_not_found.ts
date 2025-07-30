import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test that updating an order with a non-existent orderId returns 404 Not
 * Found.
 *
 * Business context: Ensures that the administrator order update API robustly
 * handles requests targeting non-existent orders. This is critical for
 * security, data integrity, and correct application behavior; the system must
 * not silently succeed or return misleading errors when attempting to modify an
 * order record that does not exist in the database.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID that does not correspond to any existing order (no
 *    setup or creation of such order is necessary).
 * 2. Attempt to update the order using the administrator order update endpoint,
 *    with syntactically valid but arbitrary order update data.
 * 3. Confirm that the API throws an error (ideally with HTTP 404 semantics).
 *    Assert that an error is correctly raised and that no order is updated or
 *    created by this operation.
 */
export async function test_api_aimall_backend_administrator_orders_test_update_order_with_invalid_id_should_return_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID representing a non-existent orderId
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Prepare syntactically valid update payload
  const updateDto: IAimallBackendOrder.IUpdate = {
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "cancelled",
    total_amount: 123456,
    currency: "KRW",
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };
  // 3. Attempt update and assert a 404-like error is thrown
  await TestValidator.error("should throw for non-existent orderId")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.update(
        connection,
        {
          orderId: nonExistentOrderId,
          body: updateDto,
        },
      );
    },
  );
}
