import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";

export async function test_api_order_payment_attempt_detail_forbidden_without_authentication(
  connection: api.IConnection,
) {
  /**
   * Validates that an unauthenticated GET
   * /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}/attempts/{attemptId}
   * request is properly forbidden.
   *
   * Scenario Steps:
   *
   * 1. Register a customer for dependency coverage (demonstrates authenticated
   *    pathway, but user is NOT authenticated for target request).
   * 2. Construct a connection object that excludes any Authorization header,
   *    ensuring the request is unauthenticated.
   * 3. Generate random UUIDs for orderId, paymentId, and attemptId using
   *    typia.random.
   * 4. Attempt to retrieve payment attempt details using the unauthenticated
   *    connection.
   * 5. Use TestValidator.error to confirm that an authentication or authorization
   *    error occurs, thereby verifying the endpoint is correctly secured.
   */

  // 1. Register a customer (dependency demonstration only; not used for authentication)
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Create unauthenticated connection (headers: {} guarantees no Authorization at all)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Generate path parameters for a payment attempt (random UUIDs)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const paymentId = typia.random<string & tags.Format<"uuid">>();
  const attemptId = typia.random<string & tags.Format<"uuid">>();

  // 4. Try to access the protected endpoint without authentication, expect an error
  await TestValidator.error(
    "unauthenticated request to order payment attempt endpoint is forbidden",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.at(
        unauthConn,
        {
          orderId,
          paymentId,
          attemptId,
        },
      );
    },
  );
}
