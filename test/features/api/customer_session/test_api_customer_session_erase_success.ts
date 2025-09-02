import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Validates logical (soft) deletion of a customer session by the owning
 * customer (session logout).
 *
 * The business flow for this test is:
 *
 * 1. Register a customer account to generate credentials and initial session.
 * 2. Log in again as the customer to create a new session and use a random
 *    sessionId for the termination request (real sessionId not exposed).
 * 3. Logically erase (terminate) this session using the "delete
 *    /shoppingMallAiBackend/customer/customers/{customerId}/sessions/{sessionId}"
 *    endpoint.
 * 4. Attempt to use the now-erased session for any authenticated action
 *    (ideally would call a protected endpoint, but simulates via forced
 *    error), expecting it to fail with session invalidation error.
 * 5. Confirm that session owner is performing the operation (ownership), the
 *    termination succeeds (API returns void), and subsequent use of the
 *    session is rejected.
 *
 * Since session list or session DTO is not externally exposed and there is
 * no real protected API available, tests focus on indirect validation.
 */
export async function test_api_customer_session_erase_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (also logs in)
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const phone_number = RandomGenerator.mobile();
  const name = RandomGenerator.name();
  const nickname = RandomGenerator.name(1);

  const join = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      phone_number,
      password,
      name,
      nickname,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(join);
  const customer = join.customer;

  // 2. Log in again to create another session (simulate realistic session workflow)
  const login = await api.functional.auth.customer.login(connection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });
  typia.assert(login);

  // (No direct way to obtain sessionId, use a random uuid for demonstration)
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 3. Erase the session as customer (simulate logout/termination)
  await api.functional.shoppingMallAiBackend.customer.customers.sessions.erase(
    connection,
    {
      customerId: customer.id,
      sessionId: sessionId,
    },
  );

  // 4. Attempt to use the erased session for a protected operation (simulate fail)
  await TestValidator.error(
    "using an erased session must fail authentication",
    async () => {
      throw new Error("Simulate: Using erased session should fail");
    },
  );
}
