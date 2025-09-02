import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import type { IPageIShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDelivery";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_deliveries_index_forbidden_without_authentication(
  connection: api.IConnection,
) {
  /**
   * Test forbidden access to order deliveries list without authentication.
   *
   * 1. Register a customer using POST /auth/customer/join (dependency step so
   *    system state is initialized, token is obtained, but not used purposely
   *    here)
   * 2. Construct a connection object WITHOUT Authorization header
   * 3. Attempt to PATCH
   *    /shoppingMallAiBackend/customer/orders/{orderId}/deliveries with a
   *    random UUID orderId and random delivery request body
   * 4. Expect the operation to fail with an authentication/authorization error,
   *    validating error through TestValidator.error
   *
   * This ensures API does not leak delivery data or allow search access without
   * explicit authentication, preserving data security and role boundary
   * integrity.
   */

  // Step 1: Register a customer to initialize backend state (authorization is not used)
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinResult);

  // Step 2: Simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Step 3 & 4: Try unauthorized PATCH and ensure it fails (auth/authorization error)
  await TestValidator.error(
    "forbid PATCH delivery search without authentication",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.index(
        unauthConn,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            orderStatus: RandomGenerator.pick([
              "pending",
              "paid",
              "shipped",
              "complete",
              "cancelled",
            ] as const),
            trackingNumber: RandomGenerator.alphaNumeric(10),
            deliveryStatus: RandomGenerator.pick([
              "ready",
              "in_progress",
              "complete",
              "failed",
              "returned",
            ] as const),
            provider: RandomGenerator.name(1),
            startDate: new Date().toISOString(),
            endDate: new Date().toISOString(),
            page: 1,
            limit: 10,
            sortBy: RandomGenerator.pick([
              "created_at",
              "delivered_at",
              "status",
            ] as const),
            sortDirection: RandomGenerator.pick(["asc", "desc"] as const),
          } satisfies IShoppingMallAiBackendOrderDelivery.IRequest,
        },
      );
    },
  );
}
