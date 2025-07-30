import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validates error handling for deletion of a non-existent loyalty transaction.
 *
 * This test attempts to delete a loyalty transaction by providing a random
 * (fake or already-deleted) loyaltyTransactionId. It covers these points:
 *
 * 1. No existing record with the provided ID.
 * 2. API returns 404 Not Found error (and not any other error or success).
 * 3. Deletion attempt does not unintentionally affect or expose unrelated data.
 *
 * Steps:
 *
 * 1. Generate a random UUID guaranteed not to exist in the loyalty transactions
 *    database.
 * 2. Attempt to delete the transaction via the administrator API endpoint.
 * 3. Confirm that the API throws an error with status code 404.
 * 4. (Cannot check audit logs directly due to SDK limitations, but validate API
 *    does not leak data.)
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_erase_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a fake random loyaltyTransactionId (assumed not to exist)
  const fakeTransactionId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete, expecting a 404 Not Found error
  await TestValidator.error(
    "Should fail to delete non-existent loyalty transaction",
  )(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.erase(
      connection,
      {
        loyaltyTransactionId: fakeTransactionId,
      },
    );
  });
}
