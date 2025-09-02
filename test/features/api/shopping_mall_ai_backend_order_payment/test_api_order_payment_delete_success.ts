import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPayment";

/**
 * E2E Test: Soft Deletion of Customer Order Payment
 *
 * Validates that a payment associated with a customer order can be
 * soft-deleted using the DELETE endpoint. Ensures that:
 *
 * - The deleted_at timestamp is set on the payment resource for audit
 *   compliance (if post-delete fetch existed)
 * - All required fields remain intact for auditing
 * - The payment would no longer appear in queries (if index API were
 *   available)
 * - Proper authorization is required and established
 * - All relationships and constraints are respected
 *
 * Workflow:
 *
 * 1. Register a new customer with valid data (auth/customer/join)
 * 2. Create a new order for the customer
 * 3. Create a new payment for the order
 * 4. Soft delete the payment by its ID and order context
 * 5. Direct post-deletion verification is not possible due to lack of
 *    fetch/index, thus only contract-level success is validated
 */
export async function test_api_order_payment_delete_success(
  connection: api.IConnection,
) {
  // 1. Register new customer and establish context
  const customerJoin: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(joinResult);
  const customerId = joinResult.customer.id;

  // 2. Create a new order for the customer
  const orderCreate: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
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
      { body: orderCreate },
    );
  typia.assert(order);

  // 3. Create a payment for the newly created order
  const paymentCreate: IShoppingMallAiBackendOrderPayment.ICreate = {
    shopping_mall_ai_backend_order_id: order.id,
    payment_method: "card",
    amount: order.total_amount,
    currency: order.currency,
    external_reference: RandomGenerator.alphaNumeric(16),
  };
  const payment =
    await api.functional.shoppingMallAiBackend.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: paymentCreate,
      },
    );
  typia.assert(payment);

  // 4. Soft delete the payment by ID
  await api.functional.shoppingMallAiBackend.customer.orders.payments.erase(
    connection,
    {
      orderId: order.id,
      paymentId: payment.id,
    },
  );

  // 5. Post-delete: No fetch/index API exists, so further audit field or absence checks cannot be performed in this test context.
}
