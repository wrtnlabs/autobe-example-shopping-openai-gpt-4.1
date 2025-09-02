import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";
import type { IPageIShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_customer_order_item_list_unauthorized_access_failure(
  connection: api.IConnection,
) {
  /**
   * Validate unauthorized access: customer2 should not be able to list items
   * for an order owned by customer1.
   *
   * Business context:
   *
   * - Order items are private to their owning customer.
   * - API must deny access when a different customer attempts to list items for a
   *   non-owned order.
   *
   * Steps:
   *
   * 1. Register customer1 (creates customer1 account and obtains authentication
   *    tokens).
   * 2. As customer1, create an order (records customer1's ID as order owner).
   * 3. Register customer2 (switches context to customer2: new tokens in
   *    connection).
   * 4. As customer2, attempt to PATCH
   *    /shoppingMallAiBackend/customer/orders/{orderId}/items with customer1's
   *    orderId.
   * 5. Validate that the API returns an authorization error (forbidden/not-owned
   *    resource).
   */

  // 1. Register customer1
  const customer1Auth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer1Auth);
  const customer1Id = typia.assert(customer1Auth.customer.id);

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
          code: RandomGenerator.alphaNumeric(8),
          status: "pending",
          total_amount: 10000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
          confirmed_at: null,
          cancelled_at: null,
          closed_at: null,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);

  // 3. Register customer2 (context switch via join)
  const customer2Auth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer2Auth);

  // 4 & 5. As customer2, attempt to list items of customer1's order; expect authorization failure
  await TestValidator.error(
    "customer2 cannot access order items of customer1",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.items.index(
        connection,
        {
          orderId: order.id,
          body: {},
        },
      );
    },
  );
}
