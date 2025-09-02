import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerSession";

export async function test_api_admin_customer_session_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate that retrieving session details for a non-existent or deleted
   * customer session (as admin) returns a proper error.
   *
   * Steps:
   *
   * 1. Create and authenticate an admin account for privileged API use.
   * 2. Register a customer to obtain a valid customerId as context for the admin
   *    session lookup.
   * 3. Attempt to retrieve session details using a random UUID as sessionId
   *    (ensured to be non-existent) for that customerId.
   * 4. Confirm that the API fails (returns an error, typically 404) and that no
   *    sensitive session data is returned.
   *
   * Business goal: Prevent unauthorized data exposure and guarantee error
   * handling when accessing non-existent resources.
   */

  // 1. Register admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(60), // e.g., simulate bcrypt hash
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Register a customer
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      phone_number: RandomGenerator.mobile(),
      password: RandomGenerator.alphaNumeric(14),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 3. Attempt to fetch details for a non-existent session ID as admin
  const fakeSessionId = typia.random<string & tags.Format<"uuid">>();
  const customerId = customerJoin.customer.id;
  await TestValidator.error(
    "should fail when accessing non-existent sessionId as admin",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.sessions.at(
        connection,
        {
          customerId,
          sessionId: fakeSessionId,
        },
      );
    },
  );
}
