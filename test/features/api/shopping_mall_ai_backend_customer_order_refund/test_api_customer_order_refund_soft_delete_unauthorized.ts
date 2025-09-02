import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_customer_order_refund_soft_delete_unauthorized(
  connection: api.IConnection,
) {
  /**
   * Ensure unauthorized refund soft-delete cannot be performed by
   * unauthenticated or invalidly authenticated users.
   *
   * Business Logic:
   *
   * 1. Register a new customer (setup necessity—no further usage required since
   *    authorization is being tested before resource validation).
   * 2. Attempt refund soft-delete with unauthenticated connection (headers: {}).
   *    Expect permission denied error.
   * 3. Attempt refund soft-delete with an explicitly invalid Authorization token.
   *    Expect permission denied error.
   *
   * In both negative test cases, use random UUIDs for orderId and refundId, as
   * any resource validation will occur after failed authentication.
   */
  // 1. Register customer for dependency purposes
  const registration = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(registration);

  // 2. Attempt soft-delete with NO authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Soft delete refund without authentication must be permission denied",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.erase(
        unauthConn,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          refundId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 3. Attempt soft-delete with invalid/bogus token
  const bogusConn: api.IConnection = {
    ...connection,
    headers: {
      ...(connection.headers ?? {}),
      Authorization: "Bearer definitely_invalid_token",
    },
  };
  await TestValidator.error(
    "Soft delete refund with invalid token must be permission denied",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.refunds.erase(
        bogusConn,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          refundId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
