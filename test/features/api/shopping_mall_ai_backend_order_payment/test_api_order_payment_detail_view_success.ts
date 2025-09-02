import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

/**
 * Test successful retrieval of payment detail for a customer's order.
 *
 * Steps:
 *
 * 1. Register a customer and authenticate (auto-login)
 * 2. Create a new order for the customer
 * 3. Create a new payment for the order (capture paymentId)
 * 4. Retrieve payment details for that payment and verify fields match
 *    creation
 *
 * Ensures that:
 *
 * - Only authenticated customers can create and access their payments
 * - Every API call's outputs are type-checked and business relationships are
 *   enforced
 * - Payment retrieval returns the correct, full details for the created
 *   payment
 */
export async function test_api_order_payment_detail_view_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (auto-login authentication)
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "Registered customer's email matches input",
    joinResult.customer.email,
    customerJoinInput.email,
  );
  TestValidator.equals(
    "Registered customer's phone_number matches input",
    joinResult.customer.phone_number,
    customerJoinInput.phone_number,
  );
  TestValidator.equals(
    "Registered customer's name matches input",
    joinResult.customer.name,
    customerJoinInput.name,
  );
  if (
    customerJoinInput.nickname !== undefined &&
    customerJoinInput.nickname !== null
  ) {
    TestValidator.equals(
      "Registered customer's nickname matches input (if set)",
      joinResult.customer.nickname,
      customerJoinInput.nickname,
    );
  }

  // 2. Create a new order for the authenticated customer
  const orderCreateInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: joinResult.customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    code: RandomGenerator.alphaNumeric(12),
    status: "pending",
    total_amount: 10000,
    currency: "KRW",
    ordered_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
  };
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderCreateInput },
    );
  typia.assert(order);
  TestValidator.equals(
    "Order's customer id matches",
    order.shopping_mall_ai_backend_customer_id,
    joinResult.customer.id,
  );
  TestValidator.equals(
    "Order code matches input",
    order.code,
    orderCreateInput.code,
  );
  TestValidator.equals(
    "Order total_amount matches input",
    order.total_amount,
    orderCreateInput.total_amount,
  );
  TestValidator.equals(
    "Order currency matches input",
    order.currency,
    orderCreateInput.currency,
  );

  // 3. Create a payment for the order
  const paymentCreateInput: IShoppingMallAiBackendOrderPayment.ICreate = {
    shopping_mall_ai_backend_order_id: order.id,
    payment_method: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "coupon",
    ] as const),
    amount: order.total_amount,
    currency: order.currency,
    external_reference: RandomGenerator.alphaNumeric(20),
  };
  const payment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreateInput,
      },
    );
  typia.assert(payment);
  TestValidator.equals(
    "Payment's order id matches order",
    payment.shopping_mall_ai_backend_order_id,
    order.id,
  );
  TestValidator.equals(
    "Payment amount matches input",
    payment.amount,
    paymentCreateInput.amount,
  );
  TestValidator.equals(
    "Payment payment_method matches input",
    payment.payment_method,
    paymentCreateInput.payment_method,
  );
  TestValidator.equals(
    "Payment currency matches input",
    payment.currency,
    paymentCreateInput.currency,
  );
  TestValidator.equals(
    "Payment external_reference matches input",
    payment.external_reference,
    paymentCreateInput.external_reference,
  );

  // 4. Retrieve the payment details and assert correctness
  const detail =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.at(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "Detail payment id matches payment",
    detail.id,
    payment.id,
  );
  TestValidator.equals(
    "Detail order id matches order",
    detail.shopping_mall_ai_backend_order_id,
    order.id,
  );
  TestValidator.equals(
    "Detail payment_method matches created",
    detail.payment_method,
    payment.payment_method,
  );
  TestValidator.equals(
    "Detail amount matches created",
    detail.amount,
    payment.amount,
  );
  TestValidator.equals(
    "Detail currency matches created",
    detail.currency,
    payment.currency,
  );
  TestValidator.equals(
    "Detail external_reference matches created",
    detail.external_reference,
    payment.external_reference,
  );
}
