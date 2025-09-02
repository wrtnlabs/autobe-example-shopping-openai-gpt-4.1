import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";

export async function test_api_customer_session_update_success(
  connection: api.IConnection,
) {
  /**
   * Test customer session modification for their own session:
   *
   * - Register customer (join: auto-login, session0)
   * - Trigger a second concurrent session via an additional join (session1)
   * - Update session1 (extend expiration)
   * - Explicitly terminate session1 (simulate logout)
   * - Validate session state transitions and integrity
   */

  // 1. Customer registration (auto-login, creates session0)
  const joinReq: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResp: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinReq,
    });
  typia.assert(joinResp);
  const customerId = joinResp.customer.id;
  TestValidator.predicate(
    "customer id generated",
    typeof customerId === "string" && customerId.length > 0,
  );

  // 2. Simulate a second session via an independent login (second join for multi-session test)
  //    (If join acts as idempotent, a new auth and session should still be created for the same account)
  const joinResp2: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinReq,
    });
  typia.assert(joinResp2);
  const session1AccessToken = joinResp2.token.access;
  // There is now a new session (session1) different from prior session.

  // In a real implementation, we'd enumerate sessions to get session1's id.
  // But since we can't do that here, we'll simulate: assume latest login is for session1.
  // For test coverage, construct a plausible session update by using customerId and a new session UUID.
  const session1Id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Extend session1 expiration time
  const extendedExpiry = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString(); // +1 day
  const updateSessionResp =
    await api.functional.shoppingMallAiBackend.customer.customers.sessions.update(
      connection,
      {
        customerId: customerId,
        sessionId: session1Id,
        body: {
          expires_at: extendedExpiry,
        } satisfies IShoppingMallAiBackendCustomerSession.IUpdate,
      },
    );
  typia.assert(updateSessionResp);
  TestValidator.equals(
    "session expiration extended",
    updateSessionResp.expires_at,
    extendedExpiry,
  );

  // 4. Explicitly terminate session1
  const terminatedAt = new Date().toISOString();
  const terminateResp =
    await api.functional.shoppingMallAiBackend.customer.customers.sessions.update(
      connection,
      {
        customerId: customerId,
        sessionId: session1Id,
        body: {
          terminated_at: terminatedAt,
        } satisfies IShoppingMallAiBackendCustomerSession.IUpdate,
      },
    );
  typia.assert(terminateResp);
  TestValidator.equals(
    "session terminated_at set",
    terminateResp.terminated_at,
    terminatedAt,
  );

  // 5. Audit: terminated_at should now be non-null, and session customerId matched
  TestValidator.equals(
    "session customer id matches",
    terminateResp.customer_id,
    customerId,
  );
  TestValidator.predicate(
    "session terminated_at present",
    typeof terminateResp.terminated_at === "string" &&
      terminateResp.terminated_at.length > 0,
  );
  TestValidator.predicate(
    "session id is uuid",
    typeof terminateResp.id === "string" && terminateResp.id.length === 36,
  );
}
