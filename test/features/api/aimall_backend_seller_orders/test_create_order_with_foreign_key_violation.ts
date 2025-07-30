import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate that order creation fails when foreign keys are invalid.
 *
 * Business context: Orders in the aimall system reference `customer_id`,
 * `seller_id`, and `address_id`, all of which are UUID foreign keys to other
 * tables. Creating an order with a value that does not correspond to an
 * existing customer, seller, or address must result in a constraint error and
 * the database must not persist the record (no partial save).
 *
 * Steps:
 *
 * 1. Generate random (non-existent) UUIDs for `customer_id`, `seller_id`, and
 *    `address_id`.
 * 2. Compose a valid order payload with these UUIDs but otherwise valid business
 *    content (random status, order number, price, currency).
 * 3. Call the order creation endpoint.
 * 4. Verify that an error is thrown (runtime error, not TypeScript error) and that
 *    no order is returned.
 * 5. (If possible) Confirm that a record was NOT created with these fake UUIDs
 *    (e.g., via a search/list call if available; otherwise, just ensure
 *    endpoint throws and catches as expected).
 *
 * Edge cases:
 *
 * - Each of the three foreign keys could be invalid independently. For this test,
 *   use three simultaneous invalid keys to maximize guarantee.
 * - This test is only valid if the endpoint rejects foreign key violations at
 *   runtime via an error.
 *
 * Note: As there is no query endpoint provided, only validate that creation
 * fails and no data is returned.
 */
export async function test_api_aimall_backend_seller_orders_test_create_order_with_foreign_key_violation(
  connection: api.IConnection,
) {
  // 1. Generate random non-existent UUIDs for all foreign key references
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();
  const invalidSellerId = typia.random<string & tags.Format<"uuid">>();
  const invalidAddressId = typia.random<string & tags.Format<"uuid">>();

  // 2. Compose a valid order payload (except for invalid FKs)
  const createPayload = {
    customer_id: invalidCustomerId,
    seller_id: invalidSellerId,
    address_id: invalidAddressId,
    order_number: `ORD-${new Date().toISOString().replace(/[:T.\-Z]/g, "")}`,
    order_status: "pending",
    total_amount: 100000,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;

  // 3 & 4. Attempt order creation and expect an error
  await TestValidator.error("foreign key violation")(async () => {
    await api.functional.aimall_backend.seller.orders.create(connection, {
      body: createPayload,
    });
  });
}
