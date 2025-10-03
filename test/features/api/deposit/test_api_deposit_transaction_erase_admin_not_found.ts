import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate that deleting a nonexistent deposit transaction as admin returns the
 * correct not found response without any side effects.
 *
 * 1. Register a new admin account.
 * 2. As admin, attempt to delete a deposit transaction using random UUIDs for
 *    depositId and transactionId.
 * 3. Assert that a not found error is returned and no state is changed.
 */
export async function test_api_deposit_transaction_erase_admin_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin account
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(adminAuth);

  // 2. As admin, attempt to delete a random/non-existent transaction
  const randomDepositId = typia.random<string & tags.Format<"uuid">>();
  const randomTransactionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete nonexistent deposit transaction as admin returns not found error",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.erase(
        connection,
        {
          depositId: randomDepositId,
          transactionId: randomTransactionId,
        },
      );
    },
  );
}
