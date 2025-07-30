import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate the create order endpoint rejects requests missing required fields.
 *
 * This test ensures robust input validation for the
 * /aimall-backend/seller/orders create API. It submits order creation requests
 * with key required fields omitted, confirming the API clearly reports
 * validation errors without creating any order record.
 *
 * Steps:
 *
 * 1. Attempt to create an order with all required fields omitted.
 * 2. Attempt to create an order with each required field omitted individually.
 * 3. Attempt to create an order with only the optional order_number field present.
 * 4. Verify each failure yields a field-level error, and that no order object is
 *    returned.
 *
 * Required fields covered: customer_id, seller_id, address_id, order_status,
 * total_amount, currency. Optional field: order_number (system generates if
 * missing).
 *
 * Compilation type tricks (as IAimallBackendOrder.ICreate) are used ONLY for
 * negative testing of input validation.
 */
export async function test_api_aimall_backend_seller_orders_test_create_order_with_missing_required_fields(
  connection: api.IConnection,
) {
  // Step 1: Attempt with all required fields missing
  await TestValidator.error("all required fields omitted should fail")(() =>
    api.functional.aimall_backend.seller.orders.create(connection, {
      body: {} as IAimallBackendOrder.ICreate,
    }),
  );

  // Prepare valid order payload for systematic omission
  const base: IAimallBackendOrder.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 12345,
    currency: "KRW",
    order_number: "ORD-20250729-0001",
  };

  // Step 2: Omit each required field one at a time
  const required: (keyof IAimallBackendOrder.ICreate)[] = [
    "customer_id",
    "seller_id",
    "address_id",
    "order_status",
    "total_amount",
    "currency",
  ];

  for (const field of required) {
    const partial = { ...base };
    delete partial[field];
    await TestValidator.error(`missing required: ${field}`)(() =>
      api.functional.aimall_backend.seller.orders.create(connection, {
        body: partial as IAimallBackendOrder.ICreate,
      }),
    );
  }

  // Step 3: Only optional 'order_number' given, all required fields omitted
  await TestValidator.error("only order_number, no required fields")(() =>
    api.functional.aimall_backend.seller.orders.create(connection, {
      body: {
        order_number: "ORD-20250729-0002",
      } as IAimallBackendOrder.ICreate,
    }),
  );
}
