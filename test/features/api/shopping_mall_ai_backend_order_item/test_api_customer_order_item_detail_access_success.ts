import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";

export async function test_api_customer_order_item_detail_access_success(
  connection: api.IConnection,
) {
  /**
   * Test that a customer can retrieve details of a specific item in their own
   * order.
   *
   * Steps:
   *
   * 1. Register (join) as a customer to obtain authentication.
   * 2. Create a customer order (populate required fields in the DTO).
   * 3. [SDK limitation] Synthesize an order item ID for demonstration, as there is
   *    no item creation/index endpoint or returned list.
   * 4. Request order item detail using the GET endpoint
   *    /shoppingMallAiBackend/customer/orders/{orderId}/items/{itemId}
   * 5. Assert that key fields (order_id, item id, currency, quantity, etc.) are
   *    present and have expected relational and type-correct values.
   *
   * Note: In a real environment, retrieving a real order item ID is
   * preferable—here, a random UUID is used due to SDK limitations.
   */

  // STEP 1: Register and authenticate the customer
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(auth);
  const customer = auth.customer;
  typia.assert(customer);

  // STEP 2: Create an order for this customer
  const orderCreate: IShoppingMallAiBackendOrder.ICreate = {
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
      { body: orderCreate },
    );
  typia.assert(order);

  // STEP 3: [SDK limitation] Synthesize an itemId for testing, as no order-item list API is provided
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // STEP 4: Retrieve order item details
  const itemDetail =
    await api.functional.shoppingMallAiBackend.customer.orders.items.at(
      connection,
      {
        orderId: order.id,
        itemId: itemId,
      },
    );
  typia.assert(itemDetail);

  // STEP 5: Assertions for core business/relational fields
  TestValidator.equals(
    "order_id matches created order",
    itemDetail.order_id,
    order.id,
  );
  TestValidator.equals("item id matches requested", itemDetail.id, itemId);
  TestValidator.equals(
    "currency matches expected",
    itemDetail.currency,
    order.currency,
  );
  TestValidator.predicate("quantity is positive", itemDetail.quantity > 0);
  TestValidator.equals(
    "status field is present",
    typeof itemDetail.status,
    "string",
  );
  TestValidator.equals(
    "created_at format",
    typeof itemDetail.created_at,
    "string",
  );
  TestValidator.equals(
    "final_amount calculation present",
    typeof itemDetail.final_amount,
    "number",
  );
  TestValidator.predicate(
    "final_amount positive",
    itemDetail.final_amount >= 0,
  );
}
