import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Attempt to delete a non-existent deposit ledger (negative test).
 *
 * This test ensures that the DELETE
 * /shoppingMallAiBackend/admin/deposits/{depositId} endpoint correctly
 * denies deletion requests for deposit ledger IDs that do not exist in the
 * system.
 *
 * 1. Admin is registered using POST /auth/admin/join with random unique
 *    credentials (username/email).
 * 2. Admin authentication context is automatically established by the join
 *    operation (access token is set).
 * 3. Attempt to delete a deposit ledger with a random UUID that's unlikely to
 *    exist.
 * 4. Validate that the API responds with an error indicating the record is not
 *    found (404 or equivalent), confirming that non-existent records cannot
 *    be deleted.
 * 5. This protects against attempts at accidental or malicious deletion of
 *    non-existent deposit records and verifies secure, robust error
 *    handling for deletion endpoints.
 */
export async function test_api_deposit_erase_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new admin (auth context set automatically)
  const adminJoinInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.name(1),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  };
  const adminAuthResult = await api.functional.auth.admin.join(connection, {
    body: adminJoinInput,
  });
  typia.assert(adminAuthResult);

  // 2. Attempt to delete a non-existent deposit ledger
  const nonExistentDepositId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting a non-existent deposit ledger should result in error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.deposits.erase(
        connection,
        {
          depositId: nonExistentDepositId,
        },
      );
    },
  );
}
