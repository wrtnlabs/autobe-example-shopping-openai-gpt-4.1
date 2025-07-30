import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate the order creation API's input validation logic when required fields
 * are missing.
 *
 * This test attempts to create orders as an administrator but purposefully
 * omits one or more required fields for each attempt. It checks that the API
 * properly rejects these incomplete submissions and returns validation errors.
 *
 * Steps:
 *
 * 1. Attempt to create an order with customer_id missing
 * 2. Attempt to create an order with seller_id missing
 * 3. Attempt to create an order with address_id missing
 * 4. Attempt to create an order with order_status missing
 * 5. Attempt to create an order with total_amount missing
 * 6. (Optional) Attempt to create an order with multiple required fields missing
 *    For each case, check that the system rejects the request with validation
 *    errors, and does not proceed to order creation.
 */
export async function test_api_aimall_backend_administrator_orders_test_admin_create_order_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Omit customer_id
  await TestValidator.error(
    "missing customer_id should cause validation error",
  )(() =>
    api.functional.aimall_backend.administrator.orders.create(connection, {
      body: {
        // customer_id is missing
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );

  // 2. Omit seller_id
  await TestValidator.error("missing seller_id should cause validation error")(
    () =>
      api.functional.aimall_backend.administrator.orders.create(connection, {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          // seller_id is missing
          address_id: typia.random<string & tags.Format<"uuid">>(),
          order_status: "pending",
          total_amount: 10000,
          currency: "KRW",
        } as any,
      }),
  );

  // 3. Omit address_id
  await TestValidator.error("missing address_id should cause validation error")(
    () =>
      api.functional.aimall_backend.administrator.orders.create(connection, {
        body: {
          customer_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          // address_id is missing
          order_status: "pending",
          total_amount: 10000,
          currency: "KRW",
        } as any,
      }),
  );

  // 4. Omit order_status
  await TestValidator.error(
    "missing order_status should cause validation error",
  )(() =>
    api.functional.aimall_backend.administrator.orders.create(connection, {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        // order_status is missing
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );

  // 5. Omit total_amount
  await TestValidator.error(
    "missing total_amount should cause validation error",
  )(() =>
    api.functional.aimall_backend.administrator.orders.create(connection, {
      body: {
        customer_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        // total_amount is missing
        currency: "KRW",
      } as any,
    }),
  );

  // 6. Omit multiple required fields (customer_id and seller_id)
  await TestValidator.error(
    "missing customer_id and seller_id should cause validation error",
  )(() =>
    api.functional.aimall_backend.administrator.orders.create(connection, {
      body: {
        // customer_id and seller_id are missing
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } as any,
    }),
  );
}
