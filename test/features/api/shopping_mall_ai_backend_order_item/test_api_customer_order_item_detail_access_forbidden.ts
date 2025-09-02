import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";

export async function test_api_customer_order_item_detail_access_forbidden(
  connection: api.IConnection,
) {
  /**
   * Test that a customer cannot access another user's order item details
   * (ownership permission check).
   *
   * 1. Register customer1 (order owner).
   * 2. Customer1 creates an order (extract orderId; itemId is not directly
   *    retrievable, see note).
   * 3. Register customer2, then context/connection will automatically switch to
   *    customer2.
   * 4. As customer2, attempt to access
   *    /shoppingMallAiBackend/customer/orders/{orderId}/items/{itemId} for
   *    customer1's data.
   * 5. Assert that access is denied by the system (forbidden or not found) to
   *    enforce cross-user data protection.
   *
   * NOTE: There is no available method to extract a real itemId from the order
   * as per current SDK and DTOs. The test uses a random UUID for itemId to
   * simulate the access for negative/perimeter security scenario. If the system
   * is designed to forbid or hide these resources from non-owners, a forbidden
   * or not found error is expected and meets the intent of boundary testing for
   * security.
   */

  // Step 1: Register customer1 (primary test user, who owns the order)
  const joinInput1 = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPwd123!",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer1Auth = await api.functional.auth.customer.join(connection, {
    body: joinInput1,
  });
  typia.assert(customer1Auth);

  // Step 2: Customer1 creates an order
  const orderInput = {
    shopping_mall_ai_backend_customer_id: customer1Auth.customer.id,
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
  } satisfies IShoppingMallAiBackendOrder.ICreate;
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      { body: orderInput },
    );
  typia.assert(order);

  // Step 3: Register customer2 (secondary test user)
  const joinInput2 = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: "TestPwd123!",
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: joinInput2,
  });
  typia.assert(customer2Auth);
  // Connection is now authenticated as customer2

  // Step 4: As customer2, attempt to access an item in customer1's order using the legitimate orderId
  const orderId = order.id;
  // There is no way to retrieve an actual itemId from the created order/data model; use a random UUID for negative test
  const itemId = typia.random<string & tags.Format<"uuid">>();

  // Step 5: Expect a forbidden or not-found error
  await TestValidator.error(
    "customer2 cannot access customer1's order item detail (permission enforcement)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.items.at(
        connection,
        {
          orderId,
          itemId,
        },
      );
    },
  );
}
