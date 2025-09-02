import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";

export async function test_api_customer_order_detail_invalid_id_failure(
  connection: api.IConnection,
) {
  /**
   * Validates error behavior when a customer attempts to view order details
   * using an invalid or non-existent orderId.
   *
   * This checks access control enforcement (so orders from other users are not
   * leakable) and strict UUID format validation at the API boundary.
   *
   * Steps:
   *
   * 1. Register and authenticate a new customer (random data, no orders created
   *    yet).
   * 2. Attempt to fetch an order using a random UUID (which does not exist) and
   *    assert that it throws an error (not found or forbidden).
   * 3. Attempt to fetch an order using a clearly malformed UUID (e.g.,
   *    'not-a-valid-uuid') and assert that input validation errors are
   *    enforced.
   *
   * This test ensures robust error feedback and access enforcement for order
   * detail queries using invalid identifiers.
   */

  // 1. Register and authenticate a customer (no orders created).
  const customerJoinBody: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const authResponse = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(authResponse);

  // 2. Attempt to fetch non-existent order (random valid UUID)
  const fakeOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "attempt to fetch non-existent order by random UUID returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.at(
        connection,
        {
          orderId: fakeOrderId,
        },
      );
    },
  );

  // 3. Attempt to fetch with clearly malformed UUID (invalid format)
  const malformedOrderId: string & tags.Format<"uuid"> =
    "not-a-valid-uuid" as any;
  await TestValidator.error(
    "attempt to fetch order with malformed UUID format returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.at(
        connection,
        {
          orderId: malformedOrderId,
        },
      );
    },
  );
}
