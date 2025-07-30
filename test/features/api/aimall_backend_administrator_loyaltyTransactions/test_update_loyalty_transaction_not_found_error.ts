import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Validate error response when updating a non-existent loyalty transaction.
 *
 * This test ensures that when an administrator attempts to update a loyalty
 * transaction using a random (non-existent) UUID, the backend responds with a
 * 404 'not found' error instead of a silent failure or unexpected success. This
 * negative-path validation is crucial to ensure robust API feedback and proper
 * compliance for audit and administrative operations.
 *
 * Step-by-step process:
 *
 * 1. Generate a random UUID (guaranteed to not match any existing loyalty
 *    transaction).
 * 2. Construct a valid update payload (in this case, using all possible mutable
 *    fields with plausible values).
 * 3. Attempt to perform the update using the SDK, expecting the request to fail.
 * 4. Assert that an error is thrown and that it represents a 404 'not found'.
 * 5. Confirm no data mutation occurs, as expected (implicit from the
 *    error/exception).
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_update_loyalty_transaction_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a guaranteed-nonexistent loyalty transaction UUID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid payload for update
  const update: IAimallBackendLoyaltyTransaction.IUpdate = {
    amount: 42.42,
    type: "correction",
    description: "Attempt update on non-existent record",
    expired_at: null,
  };

  // 3. Try to update and ensure proper error is thrown
  await TestValidator.error(
    "404 not found on non-existent loyalty transaction update",
  )(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.update(
      connection,
      {
        loyaltyTransactionId: nonExistentId,
        body: update,
      },
    );
  });
}
