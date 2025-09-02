import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validates successful retrieval of a specific order's details by the
   * authenticated customer-owner.
   *
   * This test ensures:
   *
   * 1. Customer registration and authentication propagate valid credentials.
   * 2. An order can be created for this customer, and the resulting ID is
   *    retrievable.
   * 3. The owner (authenticated customer) can retrieve full order details via GET
   *    endpoint.
   * 4. API returns all order information correctly, matching the originally
   *    provided values and respecting business context.
   */

  // 1. Register and authenticate a new customer
  const customerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customerAuth);

  // 2. Create an order as that customer
  const orderInput = {
    shopping_mall_ai_backend_customer_id: customerAuth.customer.id,
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
  } satisfies IShoppingMallAiBackendOrder.ICreate;
  const createdOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderInput },
    );
  typia.assert(createdOrder);
  TestValidator.equals(
    "created order customer id matches",
    createdOrder.shopping_mall_ai_backend_customer_id,
    customerAuth.customer.id,
  );
  TestValidator.equals(
    "created order code matches input",
    createdOrder.code,
    orderInput.code,
  );
  TestValidator.equals(
    "created order total_amount matches input",
    createdOrder.total_amount,
    orderInput.total_amount,
  );
  TestValidator.equals(
    "created order currency matches input",
    createdOrder.currency,
    orderInput.currency,
  );

  // 3. Retrieve the order detail with owner credentials
  const detail = await api.functional.shoppingMallAiBackend.customer.orders.at(
    connection,
    { orderId: createdOrder.id },
  );
  typia.assert(detail);
  TestValidator.equals(
    "retrieved order id matches created",
    detail.id,
    createdOrder.id,
  );
  TestValidator.equals(
    "retrieved customer id matches authenticated customer",
    detail.shopping_mall_ai_backend_customer_id,
    customerAuth.customer.id,
  );
  TestValidator.equals(
    "retrieved code matches creation",
    detail.code,
    orderInput.code,
  );
  TestValidator.equals(
    "retrieved total_amount matches creation",
    detail.total_amount,
    orderInput.total_amount,
  );
  TestValidator.equals(
    "retrieved currency matches creation",
    detail.currency,
    orderInput.currency,
  );
}
