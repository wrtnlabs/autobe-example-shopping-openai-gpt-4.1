import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

export async function test_api_order_payment_delete_completed_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validates that a payment which has been completed (settled) cannot be soft
   * deleted.
   *
   * This process ensures the system enforces auditability and financial
   * settlement compliance by preventing logical deletion of a payment that is
   * already completed. This test carries out the end-to-end flow as follows:
   *
   * 1. Register a new customer for shopping mall AI backend (customer join).
   * 2. Create an order associated with that customer.
   * 3. Add a payment for the order.
   * 4. Update the payment to become completed (status 'succeeded' and completed_at
   *    set).
   * 5. Attempt to delete this completed payment: expects the system to reject the
   *    deletion as forbidden by business logic.
   * 6. Verifies the payment still has not been soft deleted (deleted_at is null;
   *    remains retrievable).
   *
   * This confirms that after a payment is completed, the erase endpoint cannot
   * remove (soft-delete) it, enforcing correct settlement audit policy.
   */

  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const joinOut = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOut);
  const customer = joinOut.customer;

  // 2. Create an order for the customer
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_ai_backend_seller_id: null,
          code: RandomGenerator.alphaNumeric(10),
          status: "pending",
          total_amount: 1000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
          confirmed_at: null,
          cancelled_at: null,
          closed_at: null,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 3. Add a payment for this order
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
          external_reference: RandomGenerator.alphaNumeric(12),
        } satisfies IShoppingMallAiBackendOrderPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 4. Update payment to completed/settled (simulate successful settlement)
  const completedAt = new Date().toISOString();
  const updated =
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
  typia.assert(updated);
  TestValidator.equals(
    "payment status is succeeded after update",
    updated.status,
    "succeeded",
  );
  TestValidator.equals(
    "payment completed_at after update",
    updated.completed_at,
    completedAt,
  );

  // 5. Attempt to delete the completed payment – this should be forbidden and produce business error
  await TestValidator.error(
    "cannot delete completed payment (should be forbidden)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.erase(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
        },
      );
    },
  );

  // 6. Confirm payment is NOT soft-deleted (deleted_at still null)
  TestValidator.equals(
    "payment remains not deleted after forbidden delete",
    updated.deleted_at,
    null,
  );
}
