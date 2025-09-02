import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

/**
 * Test that duplicate/conflicting order creation is properly disallowed for
 * a customer.
 *
 * This scenario verifies business logic that prevents creation of
 * overlapping or conflicting orders (e.g., duplicate session/context for an
 * order) in the shopping mall AI backend. The test performs the following
 * steps:
 *
 * 1. Register and authenticate a new customer using valid random info
 *    (ensuring unique email and phone number, strong password, and name).
 * 2. Generate required random values for an order—unique channel ID, business
 *    order code, seller ID (or null), status, totals/currency, and current
 *    timestamp(s).
 * 3. Submit the initial order creation as the newly created customer; assert
 *    that the order is accepted and returned with valid structure and
 *    correct input-output coherence.
 * 4. Attempt to submit another order using exactly the same input as the
 *    previous order (all business context and identifiers are the same).
 * 5. Assert that the duplicate/conflicting order attempt fails with a business
 *    logic error (using TestValidator.error with a strong title).
 * 6. Assert by type and business logic that the second call did not result in
 *    a new order and the error is properly surfaced.
 */
export async function test_api_customer_order_create_duplicate_disallowed_failure(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(2),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerId: string & tags.Format<"uuid"> = customerJoin.customer.id;

  // 2. Prepare order creation DTO (all required values; same input for duplicate)
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderCode: string = RandomGenerator.alphaNumeric(10);
  const status: string = "pending";
  const totalAmount: number = 199900;
  const currency: string = "KRW";
  const nowIso: string = new Date().toISOString();

  const baseOrder: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_channel_id: channelId,
    code: orderCode,
    status,
    total_amount: totalAmount,
    currency,
    ordered_at: nowIso,
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
    shopping_mall_ai_backend_seller_id: null,
  };

  // 3. Successfully create the initial order
  const order: IShoppingMallAiBackendOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: baseOrder satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  // Validation of output matches input, critical business and type properties
  TestValidator.equals(
    "initial order returns matching code",
    order.code,
    orderCode,
  );
  TestValidator.equals(
    "order is for correct customer",
    order.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals("order status is pending", order.status, status);
  TestValidator.equals(
    "order total matches input",
    order.total_amount,
    totalAmount,
  );
  TestValidator.equals(
    "order currency matches input",
    order.currency,
    currency,
  );
  TestValidator.equals(
    "order channel matches input",
    order.shopping_mall_ai_backend_channel_id,
    channelId,
  );
  TestValidator.equals(
    "order seller is null for non-seller order",
    order.shopping_mall_ai_backend_seller_id,
    null,
  );

  // 4. Attempt to create a duplicate/conflicting order (same input)
  await TestValidator.error(
    "duplicate/conflict order creation must fail (should be rejected by business logic)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.create(
        connection,
        {
          body: baseOrder,
        },
      );
    },
  );
}
