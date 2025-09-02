import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_soft_delete_of_other_user_failure(
  connection: api.IConnection,
) {
  /**
   * Validate that a customer cannot delete another customer's order.
   *
   * This test scenario ensures strict enforcement of order ownership. Customer1
   * will join the system and create an order, and then Customer2 will join as a
   * separate user and attempt to delete Customer1's order. The expected
   * behavior is that the API denies the deletion attempt with an
   * authorization/permission error, ensuring customers cannot remove orders
   * they do not own.
   *
   * Steps:
   *
   * 1. Register Customer1 and obtain authentication context (token automatically
   *    set)
   * 2. Customer1 creates a new order and retrieve the orderId
   * 3. Register Customer2 and switch to Customer2's authentication context
   * 4. Attempt to delete (soft-delete) Customer1's order as Customer2 using DELETE
   *    /shoppingMallAiBackend/customer/orders/{orderId}
   * 5. Assert that the API request is denied and throws an error (e.g., 403
   *    Forbidden or appropriate authorization error)
   */

  // 1. Register Customer1
  const customer1Email: string = typia.random<string & tags.Format<"email">>();
  const customer1Phone: string = RandomGenerator.mobile();
  const customer1Password: string = RandomGenerator.alphaNumeric(12);
  const customer1Name: string = RandomGenerator.name();
  const customer1Nickname: string = RandomGenerator.name(1);

  const customer1Auth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer1Email,
      phone_number: customer1Phone,
      password: customer1Password,
      name: customer1Name,
      nickname: customer1Nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1Auth);
  const customer1Id = customer1Auth.customer.id;

  // 2. Customer1 creates an order
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const orderCode = RandomGenerator.alphaNumeric(10);
  const orderStatus = "pending";
  const currency = "KRW";
  const totalAmount = 10000;
  const orderDate = new Date().toISOString();

  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer1Id,
          shopping_mall_ai_backend_channel_id: channelId,
          code: orderCode,
          status: orderStatus,
          total_amount: totalAmount,
          currency: currency,
          ordered_at: orderDate,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderId = order.id;

  // 3. Register Customer2 (context switch: token auto-updates)
  const customer2Email: string = typia.random<string & tags.Format<"email">>();
  const customer2Phone: string = RandomGenerator.mobile();
  const customer2Password: string = RandomGenerator.alphaNumeric(12);
  const customer2Name: string = RandomGenerator.name();
  const customer2Nickname: string = RandomGenerator.name(1);

  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      phone_number: customer2Phone,
      password: customer2Password,
      name: customer2Name,
      nickname: customer2Nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2Auth);

  // 4. Attempt to delete (soft-delete) Customer1's order as Customer2
  await TestValidator.error(
    "should forbid deletion of order by non-owner customer",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.erase(
        connection,
        {
          orderId,
        },
      );
    },
  );
}
