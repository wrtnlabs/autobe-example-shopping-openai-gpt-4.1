import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_update_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful update flow for customer orders in the shopping mall AI
   * backend.
   *
   * 1. Register a new customer and authenticate the context. The response provides
   *    the customer entity and sets the bearer token for subsequent API calls.
   * 2. Create a new order for that customer via API, using randomly generated but
   *    valid business identifiers and required fields.
   * 3. Perform a PUT update on the order, changing its status from 'pending' to
   *    'confirmed' and updating the updated_at timestamp.
   * 4. Validate that the order's updated fields are correctly reflected,
   *    especially 'status' and 'updated_at'.
   * 5. Confirm referential integrity — the order ID and customer association are
   *    unchanged, and immutable values (created_at) remain the same.
   */
  // 1. Register and authenticate customer
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "Password123!",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinRes);
  const customer = joinRes.customer;

  // 2. Create a new order for the customer
  const orderCreateRes =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          shopping_mall_ai_backend_seller_id: null,
          code: RandomGenerator.alphaNumeric(10),
          status: "pending",
          total_amount: 50000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
          confirmed_at: null,
          cancelled_at: null,
          closed_at: null,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(orderCreateRes);

  // 3. Prepare the update: valid status transition, updated_at must be newer
  const newStatus = "confirmed";
  const newUpdatedAt = new Date(Date.now() + 5000).toISOString();
  const updateBody = {
    status: newStatus,
    updated_at: newUpdatedAt,
  } satisfies IShoppingMallAiBackendOrder.IUpdate;

  // 4. Update the order
  const updatedOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.update(
      connection,
      {
        orderId: orderCreateRes.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrder);

  // 5. Validate updates
  TestValidator.equals(
    "order status was updated",
    updatedOrder.status,
    newStatus,
  );
  TestValidator.notEquals(
    "updated_at was updated",
    updatedOrder.updated_at,
    orderCreateRes.updated_at,
  );
  TestValidator.equals(
    "order ID is unchanged",
    updatedOrder.id,
    orderCreateRes.id,
  );
  TestValidator.equals(
    "order customer association unchanged",
    updatedOrder.shopping_mall_ai_backend_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "order code unchanged",
    updatedOrder.code,
    orderCreateRes.code,
  );
  TestValidator.equals(
    "order amount unchanged",
    updatedOrder.total_amount,
    orderCreateRes.total_amount,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedOrder.currency,
    orderCreateRes.currency,
  );
  TestValidator.equals(
    "created_at is still original",
    updatedOrder.created_at,
    orderCreateRes.created_at,
  );
}
