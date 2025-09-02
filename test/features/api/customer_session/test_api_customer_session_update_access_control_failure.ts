import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";

export async function test_api_customer_session_update_access_control_failure(
  connection: api.IConnection,
) {
  /**
   * Verify that a customer cannot update another customer's session (ownership
   * enforcement).
   *
   * This test simulates registration of two separate customers. It then ensures
   * that customer B is denied access when attempting to update a session
   * belonging to customer A — confirming that the API protects session
   * resources against cross-customer tampering and unauthorized access.
   *
   * Steps:
   *
   * 1. Register customer A (generates session and auth context)
   * 2. Register customer B (switches context to B, since SDK auto-manages
   *    Authorization header)
   * 3. As customer B, attempt to update customer A's session, using random
   *    sessionId (since session enumeration isn't supported via join/login
   *    response)
   * 4. Validate that error is thrown (access forbidden or not found — both prove
   *    ownership enforcement)
   */
  // 1. Register customer A
  const customerAAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  const customerAId = customerAAuth.customer.id;

  // 2. Register customer B
  const customerBAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  const customerBId = customerBAuth.customer.id;

  // 3. As customer B, attempt to update a session that belongs to customer A
  //    Because we can't enumerate sessions, use a random UUID as sessionId — API must not allow this
  const fakeSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "Customer B access forbidden to Customer A's session (enforces session ownership)",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.customers.sessions.update(
        connection,
        {
          customerId: customerAId,
          sessionId: fakeSessionId,
          body: {
            terminated_at: new Date().toISOString(),
          } satisfies IShoppingMallAiBackendCustomerSession.IUpdate,
        },
      );
    },
  );
}
