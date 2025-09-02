import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_order_refund_soft_delete_success(
  connection: api.IConnection,
) {
  /**
   * Test the successful logical deletion (soft delete) of a refund record by
   * the customer who owns the order.
   *
   * Scenario Steps:
   *
   * 1. Register a new customer account with random, valid credentials
   * 2. Log in as the customer to ensure the connection has proper authentication
   * 3. (Order placement and refund creation are omitted; unavailable in current
   *    API/DTO set)
   * 4. Attempt to logically delete a refund via the erase API using random UUIDs
   *    for orderId and refundId
   *
   *    - Verify the erase call completes without error (deletion success assumed; no
   *         direct verification possible)
   *
   * Note: As the current API/DTO set does not expose endpoints for order or
   * refund creation, only achievable actions are executed. No TestValidator
   * logic is present since no verifiable output is returned or available.
   */
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = typia.random<string & tags.Format<"password">>();

  // 1. Customer registration
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);

  // 2. Customer login
  const loginResult = await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(loginResult);

  // 3. Attempt refund soft-delete by authenticated customer using random UUIDs as placeholders
  await api.functional.shoppingMallAiBackend.customer.orders.refunds.erase(
    connection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      refundId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
}
