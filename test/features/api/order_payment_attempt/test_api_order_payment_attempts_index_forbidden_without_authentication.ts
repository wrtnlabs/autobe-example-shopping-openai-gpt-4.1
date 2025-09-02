import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderPaymentAttempt";
import type { IPageIShoppingMallAiBackendOrderPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendOrderPaymentAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_order_payment_attempts_index_forbidden_without_authentication(
  connection: api.IConnection,
) {
  /**
   * Test security: PATCH
   * /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}/attempts
   * requires authentication.
   *
   * This test confirms that unauthenticated requests to the payment attempt
   * query endpoint are forbidden. It registers a sample customer only as a
   * prerequisite to generate plausible business data, but intentionally avoids
   * using its authentication token. The PATCH endpoint is then accessed with a
   * bare connection that lacks any Authorization header—simulating an anonymous
   * or logged-out user. The test expects the API to throw an error, indicating
   * that authentication is required (typically a 401 or 403 HTTP error).
   *
   * Steps:
   *
   * 1. Register a new customer account (to satisfy business context and generate
   *    realistic data shape).
   * 2. Create a new connection object with empty headers (no Authorization token).
   * 3. Attempt to call PATCH
   *    /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}/attempts
   *    with the unauthorized connection and random UUIDs.
   * 4. Assert that the API throws an authorization error, confirming enforcement
   *    of authentication.
   */

  // 1. Register a customer to establish business context (auth not used)
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: typia.random<string & tags.Format<"password">>(),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customer);

  // 2. Create unauthorized connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3. Attempt the secured PATCH endpoint without authentication
  await TestValidator.error(
    "unauthenticated access to PATCH /shoppingMallAiBackend/customer/orders/{orderId}/payments/{paymentId}/attempts must fail",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.orders.payments.attempts.index(
        unauthConn,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          paymentId: typia.random<string & tags.Format<"uuid">>(),
          body: {}, // No filter necessary
        },
      );
    },
  );
}
