import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderDelivery";

export async function test_api_order_delivery_detail_invalid_or_not_found(
  connection: api.IConnection,
) {
  /**
   * Test that fetching a delivery detail using invalid, non-existent, or
   * unauthorized orderId or deliveryId results in appropriate error responses
   * (not found, forbidden) rather than success.
   *
   * Steps:
   *
   * 1. Register and authenticate a customer for later negative error validation.
   * 2. Attempt to fetch delivery detail with:
   *
   *    - Both orderId and deliveryId as random (non-existent) UUIDs.
   *    - Both parameters as the same random UUID (still invalid/unlinked).
   *    - Valid UUID formats (random UUIDs), but not linked to any actual order or
   *         delivery resource.
   * 3. Assert that each GET returns an error as required by business rules for
   *    orphaned, nonexistent, or unauthorized resource attempts.
   */

  // 1. Register a customer (establish auth context)
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const auth = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(auth);
  const customer = auth.customer;

  // 2. GET with both params as random UUIDs (never linked)
  await TestValidator.error(
    "delivery detail fetch with unlinked random UUIDs triggers not found/forbidden error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          deliveryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. GET with same value for both params (still orphan/unlinked)
  await TestValidator.error(
    "delivery detail fetch using duplicated invalid UUIDs triggers not found/forbidden error",
    async () => {
      const invalidUuid = typia.random<string & tags.Format<"uuid">>();
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.at(
        connection,
        {
          orderId: invalidUuid,
          deliveryId: invalidUuid,
        },
      );
    },
  );

  // 4. GET with valid UUIDs never associated to customer context (ensures no elevation possible)
  await TestValidator.error(
    "delivery detail fetch with valid format but unassociated UUIDs triggers error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.deliveries.at(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          deliveryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
