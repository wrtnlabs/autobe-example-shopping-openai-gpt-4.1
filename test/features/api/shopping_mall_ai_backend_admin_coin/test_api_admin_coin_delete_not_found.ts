import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function test_api_admin_coin_delete_not_found(
  connection: api.IConnection,
) {
  /**
   * Test deletion of a non-existent coin wallet ledger as admin.
   *
   * This scenario validates compliance with proper business error signaling,
   * ensuring that deletion of a non-existent ledger responds with an
   * appropriate error.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin user using POST /auth/admin/join
   *    (required for authorization).
   * 2. Attempt to delete a coin wallet ledger using DELETE
   *    /shoppingMallAiBackend/admin/coins/{coinId}, passing a randomly
   *    generated UUID that is not present in the database.
   * 3. Assert that the delete operation fails with an error (i.e., system properly
   *    rejects deletion of unknown wallets to preserve evidence integrity).
   */

  // Step 1: Admin registration and authentication
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(12)}@company.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // Step 2: Attempt to delete a non-existent coin wallet ledger
  const nonExistentCoinId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "deleting non-existent coin wallet ledger should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.erase(connection, {
        coinId: nonExistentCoinId,
      });
    },
  );
}
