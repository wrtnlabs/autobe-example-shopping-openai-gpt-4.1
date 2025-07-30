import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate failure when adding order items with missing required fields
 * (product_id or quantity).
 *
 * This test ensures the order item creation API enforces schema validation,
 * returning errors if mandatory fields are missing.
 *
 * Workflow:
 *
 * 1. Register a customer using the customer registration endpoint
 * 2. Create a valid order for the customer (administrator endpoint)
 * 3. Attempt to add an order item to that order, intentionally omitting required
 *    fields (product_id and/or quantity)
 * 4. Verify that the API returns an error due to missing required
 *    property/properties, and no order item is created
 */
export async function test_api_aimall_backend_test_add_order_item_missing_required_fields_fails(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: "dummyhash",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create an order for the customer (admin privilege assumed)
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        address_id: typia.random<string & tags.Format<"uuid">>(),
        order_status: "pending",
        total_amount: 1000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 3A. Attempt to add an order item with missing product_id
  await TestValidator.error("missing product_id should fail")(() =>
    api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          // product_id intentionally omitted
          item_name: "Test Item",
          quantity: 1,
          unit_price: 100,
          total_price: 100,
        } as any, // Intentionally bypass to trigger runtime error for missing required key
      },
    ),
  );

  // 3B. Attempt to add an order item with missing quantity
  await TestValidator.error("missing quantity should fail")(() =>
    api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          item_name: "Test Item",
          // quantity intentionally omitted
          unit_price: 100,
          total_price: 100,
        } as any,
      },
    ),
  );
}
