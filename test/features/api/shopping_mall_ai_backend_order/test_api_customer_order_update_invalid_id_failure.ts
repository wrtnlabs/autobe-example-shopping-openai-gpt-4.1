import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_update_invalid_id_failure(
  connection: api.IConnection,
) {
  /**
   * Test updating an order using an invalid or non-existent orderId.
   *
   * Steps:
   *
   * 1. Register and authenticate a customer, establishing the context for a
   *    legitimate request.
   * 2. Attempt to update an order using PUT
   *    /shoppingMallAiBackend/customer/orders/{orderId} with a random UUID
   *    guaranteed not to exist, and a random but valid update payload.
   * 3. Assert that the operation fails, expecting a not found or
   *    permission/business logic error (the system must not allow update for
   *    missing orders).
   *
   * This test verifies error responses and business logic validation for order
   * updates with an invalid or inaccessible orderId.
   */

  // 1. Register and authenticate a customer
  const customerJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);

  // 2. Attempt to update an order using an obviously bogus UUID orderId
  const invalidOrderId = typia.random<string & tags.Format<"uuid">>();
  const updateInput = {
    status: "cancelled",
    delivery_notes: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    delivery_address: RandomGenerator.paragraph({ sentences: 3 }),
    customer_note: RandomGenerator.paragraph(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallAiBackendOrder.IUpdate;

  await TestValidator.error(
    "should fail to update an order with a non-existent orderId",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.update(
        connection,
        {
          orderId: invalidOrderId,
          body: updateInput,
        },
      );
    },
  );
}
