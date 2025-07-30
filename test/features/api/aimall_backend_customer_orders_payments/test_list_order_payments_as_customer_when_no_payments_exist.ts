import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IPageIAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPayment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validate retrieval of payment entries for a newly placed customer order with
 * no payments.
 *
 * This test asserts that when a customer places an order but has not yet
 * completed any payment transactions, fetching the payments list for that order
 * returns an empty set—proving the endpoint properly distinguishes between
 * orders in an unpaid state and those with completed payment events.
 *
 * Workflow:
 *
 * 1. Register a new customer (POST /aimall-backend/customers)
 * 2. Place a new order for that customer with no payment events (POST
 *    /aimall-backend/customer/orders)
 * 3. Retrieve the payments list for this order (GET
 *    /aimall-backend/customer/orders/{orderId}/payments)
 * 4. Assert response is an empty set (data.length === 0, pagination.records === 0)
 * 5. Assert strict type safety and return values
 *
 * This ensures the backend does not leak payment events for unpaid orders,
 * enforcing both business logic and API contract integrity.
 */
export async function test_api_aimall_backend_customer_orders_payments_test_list_order_payments_as_customer_when_no_payments_exist(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null, // simulate normal user registration
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Place a new order for this customer, unpaid status
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const address_id = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id,
        address_id,
        order_status: "pending", // typically used to indicate awaiting payment
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 3. Fetch payments for this order
  const paymentsPage =
    await api.functional.aimall_backend.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(paymentsPage);

  // 4. Validate business logic: should be empty
  TestValidator.equals("no payments exist")(paymentsPage.data.length)(0);
  TestValidator.equals("pagination zero records")(
    paymentsPage.pagination.records,
  )(0);
}
