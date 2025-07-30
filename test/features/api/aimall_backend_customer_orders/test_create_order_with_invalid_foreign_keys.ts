import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate foreign key constraint enforcement when creating an order with
 * invalid references.
 *
 * This test ensures that the aimall-backend order creation API enforces strict
 * foreign key integrity. It attempts to create new orders using deliberately
 * invalid (non-existent) UUIDs for `customer_id`, `seller_id`, and
 * `address_id`. According to business rules, the system must reject such
 * orders, returning a descriptive foreign key constraint error (typically a 4xx
 * HTTP error), and must not write any data to the database catalog. No partial
 * order must be created or persisted. This test covers cases where all or each
 * reference is invalid.
 *
 * Steps:
 *
 * 1. Attempt creation with all references invalid (random UUIDs for all FK
 *    fields).
 * 2. Attempt creation with only `customer_id` invalid (other FKs still random as
 *    no fixture API).
 * 3. Attempt creation with only `seller_id` invalid (other FKs still random as no
 *    fixture API).
 * 4. Attempt creation with only `address_id` invalid (other FKs still random as no
 *    fixture API).
 * 5. Confirm that API rejects each invalid input with an explicit error
 *    (TestValidator.error).
 * 6. Note: Cannot confirm absence of partial inserts/catalog mutations as no
 *    GET/LIST API exists.
 */
export async function test_api_aimall_backend_customer_orders_test_create_order_with_invalid_foreign_keys(
  connection: api.IConnection,
) {
  // Helper: Generate a random UUID (presumed not to match any real record)
  const randomUUID = () => typia.random<string & tags.Format<"uuid">>();
  // Static valid values for required simple fields
  const order_status = "pending";
  const total_amount = 10000;
  const currency = "KRW";

  // 1. All references invalid
  await TestValidator.error("All foreign keys invalid should throw error")(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: randomUUID(),
        seller_id: randomUUID(),
        address_id: randomUUID(),
        order_status,
        total_amount,
        currency,
      } satisfies IAimallBackendOrder.ICreate,
    }),
  );

  // 2. Invalid customer_id only (other FKs still random as no valid fixture API)
  await TestValidator.error(
    "Invalid customer_id foreign key should throw error",
  )(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: randomUUID(),
        seller_id: randomUUID(),
        address_id: randomUUID(),
        order_status,
        total_amount,
        currency,
      } satisfies IAimallBackendOrder.ICreate,
    }),
  );

  // 3. Invalid seller_id only (other FKs still random as no valid fixture API)
  await TestValidator.error("Invalid seller_id foreign key should throw error")(
    () =>
      api.functional.aimall_backend.customer.orders.create(connection, {
        body: {
          customer_id: randomUUID(),
          seller_id: randomUUID(),
          address_id: randomUUID(),
          order_status,
          total_amount,
          currency,
        } satisfies IAimallBackendOrder.ICreate,
      }),
  );

  // 4. Invalid address_id only (other FKs still random as no valid fixture API)
  await TestValidator.error(
    "Invalid address_id foreign key should throw error",
  )(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: randomUUID(),
        seller_id: randomUUID(),
        address_id: randomUUID(),
        order_status,
        total_amount,
        currency,
      } satisfies IAimallBackendOrder.ICreate,
    }),
  );
  // Note: Unable to assert database/catalog state post-failure without retrieval API
}
