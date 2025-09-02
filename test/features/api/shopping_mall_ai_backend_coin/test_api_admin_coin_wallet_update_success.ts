import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_wallet_update_success(
  connection: api.IConnection,
) {
  /**
   * Test successful update of existing coin wallet ledger by admin.
   *
   * Business context: This validates that an admin, after proper
   * authentication, can update the metadata or balance fields of a coin wallet
   * using the admin API. The test ensures that the update is effective (field
   * values change as expected) and that administrative audit (timestamps, etc.)
   * are updated, preserving system integrity and compliance requirements. No
   * external dependencies are necessary; test includes its own setup and
   * teardown.
   *
   * Workflow:
   *
   * 1. Register and authenticate an admin account (via join), capturing
   *    authentication context.
   * 2. Create a new coin wallet, associating it to a random customer for the
   *    purpose of this test.
   * 3. Update all updatable wallet fields, simulating an admin intervention (e.g.,
   *    correct balances).
   * 4. Assert that changes are reflected and audit (updated_at) differs.
   */

  // 1. Register admin and authenticate (token placed in connection)
  const adminCredentials = {
    username: RandomGenerator.alphabets(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: null, // explicit null for optional field
  } satisfies IShoppingMallAiBackendAdmin.ICreate;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin username matches",
    adminAuth.admin.username,
    adminCredentials.username,
  );
  TestValidator.equals(
    "admin email matches",
    adminAuth.admin.email,
    adminCredentials.email,
  );

  // 2. Create coin wallet ledger (for a random customer)
  const createBody = {
    shopping_mall_ai_backend_customer_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_coin: 0,
    expired_coin: 0,
    on_hold_coin: 0,
  } satisfies IShoppingMallAiBackendCoin.ICreate;

  const createdCoin =
    await api.functional.shoppingMallAiBackend.admin.coins.create(connection, {
      body: createBody,
    });
  typia.assert(createdCoin);
  TestValidator.equals(
    "coin wallet assigned customer ID",
    createdCoin.shopping_mall_ai_backend_customer_id,
    createBody.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "coin wallet initial usable_coin",
    createdCoin.usable_coin,
    0,
  );

  // 3. Prepare and execute update - simulate admin correcting all balances
  const updateBody = {
    total_accrued: createdCoin.total_accrued + 1000,
    usable_coin: createdCoin.usable_coin + 800,
    expired_coin: createdCoin.expired_coin + 100,
    on_hold_coin: createdCoin.on_hold_coin + 100,
  } satisfies IShoppingMallAiBackendCoin.IUpdate;

  const updatedCoin =
    await api.functional.shoppingMallAiBackend.admin.coins.update(connection, {
      coinId: createdCoin.id,
      body: updateBody,
    });
  typia.assert(updatedCoin);

  // 4. Validate update: Each changed field, and audit trail (updated_at)
  TestValidator.equals(
    "updated total_accrued is applied",
    updatedCoin.total_accrued,
    updateBody.total_accrued,
  );
  TestValidator.equals(
    "updated usable_coin is applied",
    updatedCoin.usable_coin,
    updateBody.usable_coin,
  );
  TestValidator.equals(
    "updated expired_coin is applied",
    updatedCoin.expired_coin,
    updateBody.expired_coin,
  );
  TestValidator.equals(
    "updated on_hold_coin is applied",
    updatedCoin.on_hold_coin,
    updateBody.on_hold_coin,
  );
  TestValidator.notEquals(
    "coin wallet updated_at changed after update",
    updatedCoin.updated_at,
    createdCoin.updated_at,
  );
}
