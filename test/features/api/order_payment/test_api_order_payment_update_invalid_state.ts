import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

export async function test_api_order_payment_update_invalid_state(
  connection: api.IConnection,
) {
  /**
   * Validate business logic when attempting to update a payment that is no
   * longer modifiable.
   *
   * This test simulates a customer placing an order, adding a payment, and then
   * marking the payment as 'succeeded'. It then attempts an additional update
   * on this payment to verify that the API enforces state immutability for
   * locked/completed payments.
   *
   * Steps:
   *
   * 1. Register and authenticate a customer (via /auth/customer/join)
   * 2. Create an order (via /shoppingMallAiBackend/customer/orders)
   * 3. Create a payment for the order
   *    (/shoppingMallAiBackend/customer/orders/{orderId}/payments)
   * 4. Update the payment to 'succeeded' (simulate completion; via status and
   *    completed_at fields)
   * 5. Attempt a further update (e.g., change payment_method/amount), expecting
   *    business logic error about locked state
   */
  // 1. Register and authenticate a customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Create an order
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerJoin.customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(12),
          status: "pending",
          total_amount: 50000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 3. Create payment for the order
  const payment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          shopping_mall_ai_backend_order_id: order.id,
          payment_method: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "coupon",
          ] as const),
          amount: order.total_amount,
          currency: order.currency,
        } satisfies IShoppingMallAiBackendOrderPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 4. Update payment to mark as completed (status:'succeeded')
  const completedAt = new Date().toISOString();
  const updatedPayment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.update(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: {
          status: "succeeded",
          completed_at: completedAt,
        } satisfies IShoppingMallAiBackendOrderPayment.IUpdate,
      },
    );
  typia.assert(updatedPayment);
  TestValidator.equals(
    "payment status is succeeded after completion",
    updatedPayment.status,
    "succeeded",
  );
  TestValidator.equals(
    "payment completed_at set",
    updatedPayment.completed_at,
    completedAt,
  );

  // 5. Attempt to update an already completed payment (e.g. change amount)
  await TestValidator.error(
    "cannot update payment in succeeded/locked state",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.update(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
          body: {
            amount: updatedPayment.amount + 1000,
          } satisfies IShoppingMallAiBackendOrderPayment.IUpdate,
        },
      );
    },
  );
}
