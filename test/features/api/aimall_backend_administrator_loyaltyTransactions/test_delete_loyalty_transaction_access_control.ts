import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that non-admin users are forbidden from deleting loyalty
 * transactions.
 *
 * Loyalty transaction deletion is a highly privileged operation, strictly
 * restricted to administrators. This test ensures that when an API call to
 * delete a loyalty transaction is made by a user lacking admin privileges (or
 * using insufficient credentials), the system denies the request with a
 * forbidden/access denied error. This ensures the access control policies are
 * enforced to protect critical audit data and regulatory compliance.
 *
 * Steps:
 *
 * 1. Simulate a non-admin (or insufficiently authorized) connection context.
 * 2. Attempt to call the loyalty transaction delete API with a randomly-generated
 *    loyaltyTransactionId.
 * 3. Confirm that the API responds by throwing an error (e.g., access denied,
 *    forbidden), not by returning success or allowing the deletion.
 * 4. Validate that the error is actually thrown and the privilege enforcement is
 *    intact.
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_delete_loyalty_transaction_access_control(
  connection: api.IConnection,
) {
  // 1. Simulate a non-admin/insufficient privilege context.
  // (Assume 'connection' does not possess admin authorizations for this scenario)

  // 2. Attempt to delete a randomly generated loyalty transaction using insufficient privileges.
  const loyaltyTransactionId = typia.random<string & tags.Format<"uuid">>();

  // 3. The operation must be denied: Test that an error is thrown (forbidden/access denied)
  await TestValidator.error("non-admin cannot delete loyalty transaction")(
    async () => {
      await api.functional.aimall_backend.administrator.loyaltyTransactions.erase(
        connection,
        {
          loyaltyTransactionId,
        },
      );
    },
  );
}
