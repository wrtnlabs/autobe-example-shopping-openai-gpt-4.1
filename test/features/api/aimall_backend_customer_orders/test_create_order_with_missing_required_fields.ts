import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate order creation failure cases for missing required fields as a
 * customer.
 *
 * Business context:
 *
 * - In AIMall, a customer cannot create an order without all required fields
 *   present (customer_id, seller_id, address_id, order_status, total_amount,
 *   currency).
 * - This test ensures that if required fields are omitted—such as address_id or
 *   seller_id—the API will respond with a validation error and will not create
 *   the order.
 * - Also checks that relation integrity is enforced (e.g., missing correct
 *   foreign keys), and no order is created with empty or incomplete
 *   parameters.
 *
 * Step-by-step process:
 *
 * 1. Register a new customer (precondition for order testing).
 * 2. Create a valid order with all required fields present to confirm API accepts
 *    proper input (baseline expectation).
 * 3. Try creating a new order with missing required fields (multiple negative
 *    cases): a. Omit address_id b. Omit seller_id c. Omit customer_id d. Omit
 *    currency and total_amount e. Pass empty string for order_status
 * 4. For each case, ensure API rejects invalid creation requests and no improper
 *    order is created.
 */
export async function test_api_aimall_backend_customer_orders_test_create_order_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new customer (dependency)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: "010" + typia.random<string>().slice(0, 8),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Baseline: create valid order (should succeed)
  const validOrder = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(validOrder);

  // 3a. Omit required field: address_id
  await TestValidator.error("missing address_id validation")(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        // address_id: omitted
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );

  // 3b. Omit required field: seller_id
  await TestValidator.error("missing seller_id validation")(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        // seller_id: omitted
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );

  // 3c. Omit required field: customer_id
  await TestValidator.error("missing customer_id validation")(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        // customer_id: omitted
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );

  // 3d. Omit both currency and total_amount
  await TestValidator.error("missing currency and total_amount validation")(
    () =>
      api.functional.aimall_backend.customer.orders.create(connection, {
        body: {
          customer_id: customer.id,
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          // total_amount: omitted
          // currency: omitted
        } as any,
      }),
  );

  // 3e. Pass empty string for order_status
  await TestValidator.error("order_status empty validation")(() =>
    api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "", // invalid: should not be empty
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );
}
