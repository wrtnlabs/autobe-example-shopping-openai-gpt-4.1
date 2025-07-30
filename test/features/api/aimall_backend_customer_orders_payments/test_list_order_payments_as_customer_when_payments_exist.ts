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
 * Verify the retrieval of all payment transactions for a customer's order.
 *
 * This test simulates a complete payment lifecycle for a customer order,
 * including registration, order placement, and multi-payment via different
 * methods (e.g., split or partial payments).
 *
 * 1. Register a new customer account with a unique email and phone number.
 * 2. Place a new order as the created customer (simulate realistic references for
 *    seller_id and address_id).
 * 3. Make multiple payments using distinct payment methods and amounts so that the
 *    total covers the order amount (e.g., partial payment via coupon, remainder
 *    via credit card).
 * 4. Retrieve the list of all payments for the given order using GET
 *    /customer/orders/{orderId}/payments.
 * 5. Validate that the retrieved payments match the submitted payment attempts
 *    (check method, amount, currency, transaction_id, order_id, and paid_at
 *    values).
 * 6. Confirm that the sum of amounts matches the total order amount for full
 *    payment scenarios.
 */
export async function test_api_aimall_backend_customer_orders_payments_test_list_order_payments_as_customer_when_payments_exist(
  connection: api.IConnection,
) {
  // 1. Register a new customer account
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        password_hash: "hashed-password",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a new order for this customer
  const orderCreate: IAimallBackendOrder.ICreate = {
    customer_id: customer.id,
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    address_id: typia.random<string & tags.Format<"uuid">>(),
    order_status: "pending",
    total_amount: 12000,
    currency: "KRW",
  };
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    { body: orderCreate },
  );
  typia.assert(order);

  // 3. Make multiple (split) payments for the order
  const payment1 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "coupon",
          amount: 2000,
          currency: order.currency,
          transaction_id: null,
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment1);

  const payment2 =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 10000,
          currency: order.currency,
          transaction_id: "TXN-" + order.id,
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment2);

  // 4. Retrieve all payments for the order
  const paymentListRes =
    await api.functional.aimall_backend.customer.orders.payments.index(
      connection,
      {
        orderId: order.id,
      },
    );
  typia.assert(paymentListRes);
  const paymentList = paymentListRes.data;

  // 5. Validate retrieved payment information
  TestValidator.equals("number of payments")(paymentList.length)(2);

  const actualTotal = paymentList.reduce((sum, pay) => sum + pay.amount, 0);
  TestValidator.equals("payment total sum")(actualTotal)(order.total_amount);

  // Payment detail checks
  const byMethod = (method: string) =>
    paymentList.find((p) => p.payment_method === method);
  const c1 = byMethod("coupon");
  const c2 = byMethod("credit_card");
  TestValidator.predicate("coupon payment exists")(!!c1);
  TestValidator.predicate("credit card payment exists")(!!c2);
  if (c1) {
    TestValidator.equals("coupon amount")(c1.amount)(2000);
    TestValidator.equals("coupon currency")(c1.currency)(order.currency);
    TestValidator.equals("coupon order id")(c1.order_id)(order.id);
    TestValidator.equals("coupon paid_at type")(typeof c1.paid_at)("string");
    TestValidator.equals("coupon transaction_id")(c1.transaction_id)(null);
  }
  if (c2) {
    TestValidator.equals("card amount")(c2.amount)(10000);
    TestValidator.equals("card currency")(c2.currency)(order.currency);
    TestValidator.equals("card transaction_id")(c2.transaction_id)(
      "TXN-" + order.id,
    );
    TestValidator.equals("card order id")(c2.order_id)(order.id);
    TestValidator.equals("card paid_at type")(typeof c2.paid_at)("string");
  }
}
