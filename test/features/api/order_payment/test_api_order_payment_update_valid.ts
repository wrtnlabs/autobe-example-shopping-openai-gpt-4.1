import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

export async function test_api_order_payment_update_valid(
  connection: api.IConnection,
) {
  /**
   * E2E test for successful update of an existing payment record in the
   * shopping mall AI backend (PUT
   * /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}).
   *
   * Scenario validates:
   *
   * 1. Register new customer, establishing authentication context
   * 2. Create an order for this customer
   * 3. Create a payment on that order
   * 4. Update the payment with allowed fields (method, amount, currency, status,
   *    external_reference)
   * 5. Verify the response reflects those changes
   * 6. All type safety, response structure, and business invariants are asserted
   */

  // 1. Register a new customer (establish customer authentication and use context)
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(14),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joined = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(joined);
  const customer = joined.customer;
  typia.assert(customer);
  const customerId = customer.id;
  TestValidator.equals(
    "customer email should match input",
    customer.email,
    customerInput.email,
  );

  // 2. Create an order for the customer
  const orderInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 100000.0,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
  };
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderInput },
    );
  typia.assert(order);
  const orderId = order.id;
  TestValidator.equals(
    "order is associated with customer",
    order.shopping_mall_ai_backend_customer_id,
    customerId,
  );

  // 3. Create a payment for that order
  const createPaymentInput: IShoppingMallAiBackendOrderPayment.ICreate = {
    shopping_mall_ai_backend_order_id: orderId,
    payment_method: "card",
    amount: 100000.0,
    currency: "KRW",
    external_reference: RandomGenerator.alphaNumeric(16),
  };
  const payment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId,
        body: createPaymentInput,
      },
    );
  typia.assert(payment);
  const paymentId = payment.id;
  TestValidator.equals(
    "payment is associated with order",
    payment.shopping_mall_ai_backend_order_id,
    orderId,
  );

  // 4. Update the payment record with allowed changes
  const updateInput: IShoppingMallAiBackendOrderPayment.IUpdate = {
    payment_method: "bank_transfer",
    amount: 90000.0,
    currency: "KRW",
    status: "pending",
    external_reference: RandomGenerator.alphaNumeric(16),
  };
  const updated =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.update(
      connection,
      {
        orderId,
        paymentId,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 5. Assertions to verify update results
  TestValidator.equals(
    "payment_method updated",
    updated.payment_method,
    updateInput.payment_method,
  );
  TestValidator.equals("amount updated", updated.amount, updateInput.amount);
  TestValidator.equals(
    "currency stays the same",
    updated.currency,
    updateInput.currency,
  );
  TestValidator.equals("status updated", updated.status, updateInput.status);
  TestValidator.equals(
    "external_reference updated",
    updated.external_reference,
    updateInput.external_reference,
  );
  TestValidator.equals(
    "updated payment order association",
    updated.shopping_mall_ai_backend_order_id,
    orderId,
  );
}
