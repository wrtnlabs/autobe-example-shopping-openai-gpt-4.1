import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

/**
 * End-to-end test to verify that a customer can perform a soft delete
 * (withdrawal) of their own order.
 *
 * This test covers the entire workflow:
 *
 * 1. Register a new customer and obtain authentication context (POST
 *    /auth/customer/join)
 * 2. Create a new order as that customer (POST
 *    /shoppingMallAiBackend/customer/orders)
 * 3. Perform a soft delete (withdrawal) of the order (DELETE
 *    /shoppingMallAiBackend/customer/orders/{orderId})
 * 4. (If future API expansion permits, validate that deleted_at is set and
 *    resource is hidden)
 *
 * This test confirms successful soft deletion (absence of error means the
 * operation succeeded in the current contract). Future API changes may
 * allow more direct validation of resource state post-deletion.
 */
export async function test_api_customer_order_soft_delete_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new customer and establish authentication context
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinInput,
    });
  typia.assert(customerAuth);
  const customer: IShoppingMallAiBackendCustomer = customerAuth.customer;

  // Step 2: Create a new order as this customer
  const orderCreateInput: IShoppingMallAiBackendOrder.ICreate = {
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_channel_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    code: RandomGenerator.alphaNumeric(10),
    status: "pending",
    total_amount: 1999.99,
    currency: "USD",
    ordered_at: new Date().toISOString(),
    confirmed_at: null,
    cancelled_at: null,
    closed_at: null,
  };
  const order: IShoppingMallAiBackendOrder =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: orderCreateInput,
      },
    );
  typia.assert(order);

  // Step 3: Soft delete (withdraw) the order
  await api.functional.shoppingMallAiBackend.customer.orders.erase(connection, {
    orderId: order.id,
  });
  // We cannot re-fetch the order to confirm deleted_at status due to missing GET/list API.
  // Success of erase() (absence of error) confirms the soft delete under current API contract.
}
