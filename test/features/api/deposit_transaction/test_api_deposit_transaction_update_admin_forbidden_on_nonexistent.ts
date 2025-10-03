import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate admin update on nonexistent deposit/transaction fails with correct
 * error.
 *
 * This test ensures that when an administrator attempts to update a deposit
 * transaction with random, non-existent depositId and transactionId, the update
 * is rejected with an appropriate error. This confirms that the API properly
 * enforces resource existence and permissions.
 *
 * Test steps:
 *
 * 1. Register a new admin account.
 * 2. Attempt to update a deposit transaction with random nonexistent UUIDs for
 *    depositId and transactionId, providing a minimal valid update body.
 * 3. Validate that the API returns an error (not found or forbidden) and does not
 *    perform the update. No resource changes are validated, only
 *    error/permission handling.
 */
export async function test_api_deposit_transaction_update_admin_forbidden_on_nonexistent(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);
  // 2. Attempt update of nonexistent deposit transaction
  const depositId = typia.random<string & tags.Format<"uuid">>();
  const transactionId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    business_status: RandomGenerator.pick([
      "applied",
      "confirmed",
      "failed",
      "in_review",
      "reversed",
      "fraud_suspected",
      "manual_adjustment",
    ] as const),
  } satisfies IShoppingMallDepositTransaction.IUpdate;
  await TestValidator.error(
    "should reject update to nonexistent deposit/transaction",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.update(
        connection,
        {
          depositId,
          transactionId,
          body: updateBody,
        },
      );
    },
  );
}
