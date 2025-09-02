import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Admin can permanently (hard) delete a coin wallet ledger and
   * deletion is validated.
   *
   * 1. Register a fresh admin user and obtain authorization (token is set on
   *    connection automatically).
   * 2. As admin, create a test coin wallet ledger (assign as seller-type wallet
   *    for one-off test isolation).
   * 3. Perform DELETE on the created coin's ID as admin.
   * 4. Validate that the DELETE returns successfully (void response, no error
   *    thrown).
   * 5. Attempt to DELETE again to confirm that the coin is permanently gone
   *    (should error).
   */

  // 1. Register a new admin account (this sets connection.headers.Authorization on success)
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(40),
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin join returns correct type",
    typeof adminAuth.admin.id,
    "string",
  );
  TestValidator.predicate(
    "admin is active",
    adminAuth.admin.is_active === true,
  );

  // 2. Create a test coin wallet ledger (owned by a non-existent seller for isolation)
  const coinInput: IShoppingMallAiBackendCoin.ICreate = {
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_seller_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    total_accrued: 0,
    usable_coin: 0,
    expired_coin: 0,
    on_hold_coin: 0,
  };
  const createdCoin =
    await api.functional.shoppingMallAiBackend.admin.coins.create(connection, {
      body: coinInput,
    });
  typia.assert(createdCoin);
  TestValidator.equals(
    "coin created with matching seller_id",
    createdCoin.shopping_mall_ai_backend_seller_id,
    coinInput.shopping_mall_ai_backend_seller_id,
  );
  TestValidator.equals(
    "coin usable balance is zero",
    createdCoin.usable_coin,
    0,
  );

  // 3. Permanently delete the coin wallet using its ID as admin
  await api.functional.shoppingMallAiBackend.admin.coins.erase(connection, {
    coinId: createdCoin.id,
  });

  // 4. (Negative check) Try again to delete the same coin wallet, expect error (already deleted)
  await TestValidator.error(
    "re-deleting a hard-deleted coin wallet throws",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.erase(connection, {
        coinId: createdCoin.id,
      });
    },
  );
}
