import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

export async function test_api_order_payment_create_duplicate_prevention(
  connection: api.IConnection,
) {
  /**
   * Verifies duplicate payment prevention for single order.
   *
   * 1. Registers a customer for proper authentication context.
   * 2. Creates a new order as that customer.
   * 3. Creates a first payment for the order (happy path).
   * 4. Attempts to create a second (identical) payment with same parameters for
   *    the order.
   * 5. Validates that the duplicate payment attempt is blocked with an error and
   *    not allowed by API.
   */

  // 1. Customer registration
  const email = typia.random<string & tags.Format<"email">>();
  const phone = RandomGenerator.mobile();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);
  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number: phone,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);
  const customerId = join.customer.id;

  // 2. Order creation
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = RandomGenerator.alphaNumeric(12);
  const totalAmount = 10000;
  const currency = "KRW";
  const status = "pending";
  const now = new Date().toISOString();
  const createdOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerId,
          shopping_mall_ai_backend_channel_id: channelId,
          code: orderCode,
          status: status,
          total_amount: totalAmount,
          currency: currency,
          ordered_at: now,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(createdOrder);
  const orderId = createdOrder.id;

  // 3. First payment creation
  const externalReference = RandomGenerator.alphaNumeric(24);
  const paymentMethod = RandomGenerator.pick([
    "card",
    "bank_transfer",
    "coupon",
    "mobile",
    "cash",
  ] as const);
  const paymentParams = {
    shopping_mall_ai_backend_order_id: orderId,
    payment_method: paymentMethod,
    amount: totalAmount,
    currency: currency,
    external_reference: externalReference,
  } satisfies IShoppingMallAiBackendOrderPayment.ICreate;

  const payment1 =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId: orderId,
        body: paymentParams,
      },
    );
  typia.assert(payment1);
  TestValidator.equals(
    "first payment should have correct order id",
    payment1.shopping_mall_ai_backend_order_id,
    orderId,
  );
  TestValidator.equals(
    "first payment should have correct method",
    payment1.payment_method,
    paymentMethod,
  );
  TestValidator.equals(
    "first payment should have correct amount",
    payment1.amount,
    totalAmount,
  );
  TestValidator.equals(
    "first payment should have correct currency",
    payment1.currency,
    currency,
  );
  TestValidator.equals(
    "first payment should have correct external_reference",
    payment1.external_reference,
    externalReference,
  );

  // 4. Attempt duplicate payment (should fail)
  await TestValidator.error(
    "duplicate payment for same order must be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
        connection,
        {
          orderId: orderId,
          body: paymentParams,
        },
      );
    },
  );
}
