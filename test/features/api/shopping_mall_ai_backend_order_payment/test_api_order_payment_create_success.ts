import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

/**
 * Validates successful creation of an order payment for a customer order
 * via API.
 *
 * This test executes a realistic workflow: it registers a customer using
 * the join endpoint (with valid email, phone, password, legal name, and
 * optional nickname). It then creates an order for that customer,
 * specifying all required DTO fields, and uses the new order id in the path
 * param for the payment creation endpoint. A payment is posted to the order
 * with amount/currency/method/optional external reference. The response is
 * fully validated for type safety and correctness: confirms the correct
 * order reference, matches amount/currency/method, and checks required
 * fields like status, creation/requested timestamps.
 *
 * Steps:
 *
 * 1. Register customer and authenticate, saving DTO for later use
 * 2. Create an order for the customer (minimal required fields)
 * 3. Create a payment for the order matching order id/amount/currency
 * 4. Assert all business DTO and logic validations as required
 */
export async function test_api_order_payment_create_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (and authenticate)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // 2. Create a new order for the registered customer
  const orderCreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    code: RandomGenerator.alphaNumeric(10).toUpperCase(),
    status: "pending",
    total_amount: 99000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
  } satisfies IShoppingMallAiBackendOrder.ICreate;
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderCreate },
    );
  typia.assert(order);

  // 3. Create a payment for this order
  const paymentCreate = {
    shopping_mall_ai_backend_order_id: order.id,
    payment_method: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "mobile",
      "coupon",
    ] as const),
    amount: order.total_amount,
    currency: order.currency,
    external_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAiBackendOrderPayment.ICreate;
  const payment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreate,
      },
    );
  typia.assert(payment);

  // 4. Assertions for consistency and correctness
  TestValidator.equals(
    "payment's order_id matches order",
    payment.shopping_mall_ai_backend_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment amount matches input",
    payment.amount,
    paymentCreate.amount,
  );
  TestValidator.equals(
    "payment currency matches order",
    payment.currency,
    paymentCreate.currency,
  );
  TestValidator.equals(
    "payment method matches input",
    payment.payment_method,
    paymentCreate.payment_method,
  );
  TestValidator.predicate(
    "payment status is set",
    typeof payment.status === "string" && payment.status.length > 0,
  );
  TestValidator.predicate(
    "payment created_at timestamp exists",
    typeof payment.created_at === "string" && payment.created_at.length > 0,
  );
  TestValidator.predicate(
    "payment requested_at is ISO date",
    typeof payment.requested_at === "string" &&
      !isNaN(Date.parse(payment.requested_at)),
  );
}
