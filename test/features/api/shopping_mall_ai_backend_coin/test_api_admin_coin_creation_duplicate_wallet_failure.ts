import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_creation_duplicate_wallet_failure(
  connection: api.IConnection,
) {
  /**
   * Test failure of coin wallet creation due to duplicate wallet for the same
   * customer.
   *
   * This test verifies the uniqueness constraint for digital coin wallets
   * managed by admins.
   *
   * Workflow:
   *
   * 1. Register and authenticate a new admin user to obtain a privileged session.
   * 2. Generate a unique test customer UUID (in the absence of real customer API
   *    exposure, this is simulated for uniqueness constraint testing).
   * 3. Create the first coin wallet for this customer as the admin and validate
   *    the response structure and logical field values.
   * 4. Attempt to create a second coin wallet for the same customer, which must
   *    fail due to uniqueness constraints. Assert proper business logic
   *    enforcement by verifying that the duplicate wallet creation is rejected
   *    with an error.
   */
  // Admin registration credentials
  const adminUsername: string = RandomGenerator.alphabets(10);
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@testcompany.co.kr`;
  const passwordHash: string = RandomGenerator.alphaNumeric(32); // Simulate hashed password

  // Step 1: Register and authenticate admin
  const adminAuth: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: passwordHash,
        name: RandomGenerator.name(),
        email: adminEmail,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(adminAuth);
  typia.assert(adminAuth.admin);
  TestValidator.predicate(
    "admin account should be active",
    adminAuth.admin.is_active === true,
  );

  // Step 2: Simulate new customer id for coin wallet (real customer API not exposed)
  const customerId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 3: Create the first coin wallet for this customer
  const firstCoin: IShoppingMallAiBackendCoin =
    await api.functional.shoppingMallAiBackend.admin.coins.create(connection, {
      body: {
        shopping_mall_ai_backend_customer_id: customerId,
        shopping_mall_ai_backend_seller_id: null,
        total_accrued: 0,
        usable_coin: 0,
        expired_coin: 0,
        on_hold_coin: 0,
      } satisfies IShoppingMallAiBackendCoin.ICreate,
    });
  typia.assert(firstCoin);
  TestValidator.equals(
    "coin wallet customer id matches input",
    firstCoin.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "coin wallet usable_coin is zero on creation",
    firstCoin.usable_coin,
    0,
  );
  TestValidator.equals(
    "coin wallet seller id should be null on customer wallet",
    firstCoin.shopping_mall_ai_backend_seller_id,
    null,
  );

  // Step 4: Attempt to create another coin wallet for the same customer (should fail)
  await TestValidator.error(
    "duplicate coin wallet creation for the same customer should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.coins.create(
        connection,
        {
          body: {
            shopping_mall_ai_backend_customer_id: customerId,
            shopping_mall_ai_backend_seller_id: null,
            total_accrued: 0,
            usable_coin: 0,
            expired_coin: 0,
            on_hold_coin: 0,
          } satisfies IShoppingMallAiBackendCoin.ICreate,
        },
      );
    },
  );
}
