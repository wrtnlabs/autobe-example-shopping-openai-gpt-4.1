import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

export async function test_api_order_payment_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validates the system behavior when requesting a payment detail with a
   * non-existent paymentId for an existing order.
   *
   * This test ensures that:
   *
   * - The endpoint GET
   *   /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}
   *   returns a not found (404) or domain-level error when a non-existent
   *   paymentId is used.
   * - Authentication and business prerequisites are respected: customer
   *   registration and valid order creation are completed.
   * - The user cannot retrieve a payment that does not exist, and proper error
   *   handling is enforced by the backend.
   *
   * Steps:
   *
   * 1. Register a customer account (establish authentication context)
   * 2. Create an order as that customer, obtain the orderId
   * 3. Request a payment detail for this order, but provide a random (invalid or
   *    non-existent) paymentId
   * 4. Assert that the system raises the appropriate not found or business error
   */

  // 1. Register a customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const customerAuthorized = await api.functional.auth.customer.join(
    connection,
    { body: joinInput },
  );
  typia.assert(customerAuthorized);
  const customer = customerAuthorized.customer;

  // 2. Create an order
  const orderInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    code: RandomGenerator.alphaNumeric(10),
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
      { body: orderInput },
    );
  typia.assert(order);

  // 3. Request payment detail with a random paymentId (not associated with the order)
  const nonExistentPaymentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return not found for non-existent paymentId in order payments.at endpoint",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.at(
        connection,
        {
          orderId: order.id,
          paymentId: nonExistentPaymentId,
        },
      );
    },
  );
}
