import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCustomerWithdrawal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomerWithdrawal";

export async function test_api_admin_customer_withdrawal_detail_unauthorized_or_notfound(
  connection: api.IConnection,
) {
  /**
   * E2E test for verifying forbidden or not-found access to a customer
   * withdrawal record via the admin endpoint.
   *
   * Steps:
   *
   * 1. Register a new admin user using the /auth/admin/join endpoint (to obtain
   *    admin authentication).
   * 2. Attempt to access a customer withdrawal record using random UUIDs for both
   *    customerId and withdrawalId, ensuring no such withdrawal could exist or
   *    it cannot belong to that customer.
   * 3. Expect the operation to fail, validating business rule by checking that a
   *    not-found (404) or forbidden/unauthorized error is thrown.
   */

  // Step 1: Register a new admin and authenticate
  const adminJoinResponse = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResponse);
  typia.assert(adminJoinResponse.admin);

  // Step 2: Attempt to access a customer withdrawal that does NOT exist (random UUIDs)
  await TestValidator.error(
    "Admin cannot access nonexistent or unrelated customer withdrawal record",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.customers.withdrawals.at(
        connection,
        {
          customerId: typia.random<string & tags.Format<"uuid">>(),
          withdrawalId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
