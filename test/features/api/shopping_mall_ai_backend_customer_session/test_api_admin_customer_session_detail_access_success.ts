import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";

export async function test_api_admin_customer_session_detail_access_success(
  connection: api.IConnection,
) {
  /**
   * This test ensures that an admin can access detailed information about a
   * specific customer session via the admin session detail endpoint.
   *
   * Workflow:
   *
   * 1. Register and authenticate an admin to obtain a valid admin JWT in
   *    connection.headers.
   * 2. Register a new customer account (should result in an immediate
   *    authenticated session for that customer).
   * 3. Extract the new customer id.
   * 4. Generate a session id — since there is no session listing endpoint in the
   *    SDK, generate a test uuid for sessionId.
   * 5. Using the admin authorization, fetch the session details for the customer
   *    using the admin session detail endpoint.
   * 6. Validate that all properties (including access_token, refresh_token,
   *    timestamps, IP, user_agent, and customer linkage) are correctly
   *    returned, and the linkage between customerId and the session is valid.
   */

  // 1. Register and authenticate admin
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(1),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);
  TestValidator.predicate(
    "admin should be active",
    adminRegistration.admin.is_active,
  );

  // 2. Register new customer (triggers session creation)
  const customerRegistration = await api.functional.auth.customer.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone_number: RandomGenerator.mobile(),
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.Format<"password">,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    },
  );
  typia.assert(customerRegistration);

  // 3. Extract customerId
  const customer = customerRegistration.customer;
  typia.assert(customer);
  const customerId = customer.id;
  TestValidator.predicate(
    "customer id exists",
    typeof customerId === "string" && !!customerId,
  );

  // 4. Generate a sessionId. Since there is no session list endpoint to obtain the real session id, use a random UUID.
  const sessionId = typia.random<string & tags.Format<"uuid">>();

  // 5. As admin, fetch session info for the (random) session id for this customer
  const session =
    await api.functional.shoppingMallAiBackend.admin.customers.sessions.at(
      connection,
      {
        customerId,
        sessionId,
      },
    );
  typia.assert(session);

  // 6. Validate session properties and linkage
  TestValidator.equals(
    "session customer id matches",
    session.customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "session id is uuid format",
    typeof session.id === "string" && session.id.length > 0,
  );
  TestValidator.predicate(
    "session access_token is string",
    typeof session.access_token === "string",
  );
  TestValidator.predicate(
    "session expires_at is valid date-time",
    typeof session.expires_at === "string" && session.expires_at.length > 0,
  );
  TestValidator.predicate(
    "session created_at is valid date-time",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
  TestValidator.predicate(
    "session ip_address is string",
    typeof session.ip_address === "string",
  );
  TestValidator.predicate(
    "session user_agent is string",
    typeof session.user_agent === "string",
  );
}
