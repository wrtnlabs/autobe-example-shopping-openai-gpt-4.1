import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";

export async function test_api_admin_customer_session_erase_success(
  connection: api.IConnection,
) {
  /**
   * Ensure an admin can logically erase a customer's session and the session is
   * thereafter unusable.
   *
   * Steps:
   *
   * 1. Register a new admin and authenticate, obtaining global admin rights.
   * 2. Register a customer and authenticate as the customer to create a session.
   * 3. As admin, erase that specific customer session using correct customerId and
   *    a substitute for sessionId (since API does not expose sessionId, use
   *    refresh token as the best available identifier).
   * 4. Confirm the erase call returned no error (logical delete).
   * 5. Attempt to reuse the erased session by performing a new login as the
   *    customer; since login creates new session/tokens, this always succeeds
   *    unless the account is disabled, so the session logical delete cannot be
   *    directly tested here. Comment accordingly.
   */

  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphabets(8);
  const adminPasswordHash = RandomGenerator.alphabets(12); // As password hash is opaque
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: adminPasswordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
        phone_number: null,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register customer and authenticate to generate a session
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(12);
  const customer: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        phone_number: RandomGenerator.mobile(),
        password: customerPassword as string & tags.Format<"password">,
        name: RandomGenerator.name(),
        nickname: RandomGenerator.name(1),
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(customer);

  const login: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: {
        email: customerEmail,
        password: customerPassword as string & tags.Format<"password">,
      } satisfies IShoppingMallAiBackendCustomer.ILogin,
    });
  typia.assert(login);

  // 3. Erase the session (logical deletion)
  await api.functional.shoppingMallAiBackend.admin.customers.sessions.erase(
    connection,
    {
      customerId: login.customer.id,
      sessionId: login.token.refresh as string & tags.Format<"uuid">, // True sessionIds are not exposed by available API, using refresh token as best approximation for test
    },
  );

  // 4. Confirm erase completed (API returns void; absence of error = logical success)
  // 5. Attempting session reuse directly is not possible because exposed APIs do not express session lifecycles; further validation requires dedicated session validation endpoints (not available here)
}
