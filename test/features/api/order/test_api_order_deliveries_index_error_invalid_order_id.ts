import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";
import type { IPageIShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderDelivery";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_deliveries_index_error_invalid_order_id(
  connection: api.IConnection,
) {
  /**
   * Validates that supplying an invalid or non-existent orderId to the
   * deliveries endpoint results in a proper error rather than exposing delivery
   * data or responding as if the order exists.
   *
   * Steps:
   *
   * 1. Register and log in a test customer (generating random, valid credentials
   *    and profile info).
   * 2. Attempt to list deliveries for a non-existent orderId (random UUID not
   *    corresponding to any created order).
   * 3. Verify that the API throws an error (not found, insufficient privilege,
   *    etc.), and does not return any delivery data.
   */

  // 1. Register and log in the customer
  const joinOutput = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: "TestPassword!123",
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(joinOutput);

  // 2. Attempt to list deliveries for a non-existent (random) orderId
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "API throws error for non-existent orderId on deliveries index",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.index(
        connection,
        {
          orderId: invalidOrderId,
          body: {},
        },
      );
    },
  );
}
