import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_detail_unauthorized_access_failure(
  connection: api.IConnection,
) {
  /**
   * Test that an authenticated customer cannot view another customer's order
   * details.
   *
   * Ensures customer data privacy by verifying that only the customer who owns
   * an order can access its details. Guarantees that even with a valid orderId,
   * an unrelated authenticated customer cannot view protected resources.
   *
   * Steps:
   *
   * 1. Register customer1 and obtain their account info (implicit login).
   * 2. As customer1, create an order and store its orderId.
   * 3. Register customer2 (token switches context to customer2).
   * 4. As customer2, attempt to view customer1's order, expecting access to be
   *    denied with an error.
   */
  // 1. Register customer1
  const customer1Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1Join);
  const customer1Id = customer1Join.customer.id;

  // 2. Create an order as customer1
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer1Id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_ai_backend_seller_id: null,
          code: RandomGenerator.alphaNumeric(10),
          status: "pending",
          total_amount: 50000,
          currency: "KRW",
          ordered_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
          confirmed_at: null,
          cancelled_at: null,
          closed_at: null,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  const protectedOrderId = order.id;

  // 3. Register customer2 (automatically switches context as authenticated)
  const customer2Join = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2Join);

  // 4. As customer2, attempt to view customer1's order; expect a denial error
  await TestValidator.error(
    "another customer cannot access order details",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.at(
        connection,
        {
          orderId: protectedOrderId,
        },
      );
    },
  );
}
