import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Validates successful creation of a payment transaction for a customer order.
 *
 * This test covers the end-to-end scenario where a customer makes a payment for
 * their order:
 *
 * 1. Create a new customer (unique email/phone, 'active' status)
 * 2. Create a new seller (for order association)
 * 3. Create an order for that customer (referencing created seller), with a fixed
 *    amount and currency
 * 4. Submit a payment with fields that match order (method, amount, currency,
 *    etc.)
 * 5. Assert payment creation, correct fields, and expected payment reference
 * 6. Edge case: Attempt a second (partial) payment to test business logic for
 *    split or multiple payments
 */
export async function test_api_aimall_backend_customer_orders_payments_test_create_payment_for_order_success(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: "hashedpass123",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create an order for the customer (with reference IDs for customer, seller, address)
  const addressId: string = typia.random<string & tags.Format<"uuid">>();
  const orderTotal = 50000;
  const orderCurrency = "KRW";
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: orderTotal,
        currency: orderCurrency,
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 4. Create a payment with correct details
  const now = new Date().toISOString();
  const paymentMethod = "credit_card";
  const transactionId = `TXN-${Date.now()}`;
  const payment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: paymentMethod,
          amount: orderTotal,
          currency: orderCurrency,
          transaction_id: transactionId,
          paid_at: now,
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(payment);
  TestValidator.equals("order id")(payment.order_id)(order.id);
  TestValidator.equals("amount matches")(payment.amount)(orderTotal);
  TestValidator.equals("currency matches")(payment.currency)(orderCurrency);
  TestValidator.equals("payment method")(payment.payment_method)(paymentMethod);
  TestValidator.equals("transaction id")(payment.transaction_id)(transactionId);
  TestValidator.equals("paid_at matches")(payment.paid_at)(now);

  // 5. (Edge case) Attempt a second (partial/split) payment for the same order
  const partialAmount = orderTotal / 2;
  const secondTransactionId = `TXN-${Date.now()}-2`;
  const partialPayment =
    await api.functional.aimall_backend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "deposit",
          amount: partialAmount,
          currency: orderCurrency,
          transaction_id: secondTransactionId,
          paid_at: new Date().toISOString(),
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  typia.assert(partialPayment);
  TestValidator.equals("order id")(partialPayment.order_id)(order.id);
  TestValidator.equals("amount matches")(partialPayment.amount)(partialAmount);
  TestValidator.equals("currency matches")(partialPayment.currency)(
    orderCurrency,
  );
  TestValidator.equals("payment method")(partialPayment.payment_method)(
    "deposit",
  );
  TestValidator.equals("transaction id")(partialPayment.transaction_id)(
    secondTransactionId,
  );
}
