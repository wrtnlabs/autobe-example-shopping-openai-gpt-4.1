import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * E2E test for retrieving a specific payment's details for a customer's order.
 *
 * Business goal: Verify that a customer can retrieve full details of their own
 * payment records for a given order, and that errors occur when attempting
 * access to non-existent or unauthorized records.
 *
 * Steps:
 *
 * 1. Register a new customer.
 * 2. Create an order as that customer.
 * 3. Add two different payments to the order (different payment_method/amount).
 * 4. Retrieve each payment by its ID and validate correctness.
 * 5. Confirm error on retrieval with non-existent paymentId.
 * 6. Confirm error on payment-permission violation, if possible.
 */
export async function test_api_aimall_backend_customer_orders_payments_test_retrieve_specific_payment_for_order_as_customer(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: null, // simulate secure channel flow
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Create order as the customer
  const orderInput: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_number: undefined, // omitted for auto-generation
    order_status: "pending",
    total_amount: 50000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 3. Add two payments with distinct method/amount
  const payment1Input: IAimallBackendPayment.ICreate = {
    payment_method: "credit_card",
    amount: 20000,
    currency: "KRW",
    transaction_id: "TXN-1",
    paid_at: new Date().toISOString(),
  };
  const payment2Input: IAimallBackendPayment.ICreate = {
    payment_method: "coupon",
    amount: 30000,
    currency: "KRW",
    transaction_id: "TXN-2",
    paid_at: new Date().toISOString(),
  };
  const payment1 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: payment1Input,
      },
    );
  typia.assert(payment1);
  const payment2 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: payment2Input,
      },
    );
  typia.assert(payment2);

  // 4. Retrieve payment1 and validate
  const payment1_fetched =
    await api.functional.aimall_backend.customer.orders.payments.at(
      connection,
      {
        orderId: order.id,
        paymentId: payment1.id,
      },
    );
  typia.assert(payment1_fetched);
  TestValidator.equals("payment1 data - id")(payment1_fetched.id)(payment1.id);
  TestValidator.equals("payment1 data - amount")(payment1_fetched.amount)(
    payment1Input.amount,
  );
  TestValidator.equals("payment1 data - method")(
    payment1_fetched.payment_method,
  )(payment1Input.payment_method);

  // 5. Retrieve payment2 and validate
  const payment2_fetched =
    await api.functional.aimall_backend.customer.orders.payments.at(
      connection,
      {
        orderId: order.id,
        paymentId: payment2.id,
      },
    );
  typia.assert(payment2_fetched);
  TestValidator.equals("payment2 data - id")(payment2_fetched.id)(payment2.id);
  TestValidator.equals("payment2 data - amount")(payment2_fetched.amount)(
    payment2Input.amount,
  );
  TestValidator.equals("payment2 data - method")(
    payment2_fetched.payment_method,
  )(payment2Input.payment_method);

  // 6. Attempt to GET a non-existent paymentId (should error)
  await TestValidator.error("non-existent payment")(async () => {
    await api.functional.aimall_backend.customer.orders.payments.at(
      connection,
      {
        orderId: order.id,
        paymentId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 7. Attempt to GET a payment tied to a different order/customer
  // Not implemented: only customer context and no explicit user switch possible with current API
}
