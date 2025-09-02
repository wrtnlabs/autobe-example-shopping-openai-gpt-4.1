import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_detail_not_found(
  connection: api.IConnection,
) {
  /**
   * Validate proper error handling when requesting details for a non-existent
   * coin wallet as admin.
   *
   * BUSINESS CONTEXT: Admins must not be able to retrieve details for coin
   * wallets that do not exist or have been deleted. Attempting to fetch such a
   * resource should result in a 'not found' (404) or 'forbidden' (403) error,
   * ensuring the platform does not leak account details or misrepresent
   * resource presence. This test verifies that appropriate error responses are
   * returned for invalid accesses.
   *
   * Steps:
   *
   * 1. Register and authenticate a new admin account (ensures 'admin' context)
   * 2. Attempt to query coin wallet details with a random UUID (not expected to
   *    exist)
   * 3. Assert that an error (not found or forbidden) occurs
   */

  // 1. Register and authenticate a new admin account
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(30), // Simulated hash string
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // 2. Attempt to query coin wallet details with a non-existent coinId
  const randomNonExistentCoinId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should error when fetching details for non-existent coin wallet (404 or 403)",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.at(connection, {
        coinId: randomNonExistentCoinId,
      });
    },
  );
}
