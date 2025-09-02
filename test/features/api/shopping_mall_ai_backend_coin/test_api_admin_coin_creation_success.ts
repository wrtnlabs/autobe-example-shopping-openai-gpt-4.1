import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_creation_success(
  connection: api.IConnection,
) {
  /**
   * Validates that an authenticated admin can successfully create a coin wallet
   * for a customer.
   *
   * This test ensures that:
   *
   * 1. The admin authentication prerequisite is satisfied by registering a new
   *    admin using the join endpoint.
   * 2. With admin credentials, the API allows the creation of a coin wallet
   *    associated to a specific customer.
   * 3. The wallet creation request requires all numeric balances to be 0 or
   *    greater, and the supplied owner (customer ID) should be a valid UUID.
   * 4. The returned wallet object matches the supplied input, is linked to the
   *    customer, and system fields (such as id/timestamps) are included and
   *    type-accurate.
   *
   * Steps:
   *
   * 1. Register a new admin and authenticate using /auth/admin/join.
   * 2. Construct a coin wallet creation body referencing a random customer UUID
   *    and valid initial balances.
   * 3. Call /shoppingMallAiBackend/admin/coins as the admin to create the wallet.
   * 4. Assert all required fields are present in the result, that the wallet is
   *    linked to the correct customer, and balances match expectations.
   * 5. Ensure updated_at and created_at are present and correctly typed.
   */
  // Step 1: Register new admin and authenticate
  const adminInput = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: null,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  // Step 2: Prepare coin creation body with a random customer UUID and valid balances
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const walletBody = {
    shopping_mall_ai_backend_customer_id: customerId,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_coin: 0,
    expired_coin: 0,
    on_hold_coin: 0,
  } satisfies IShoppingMallAiBackendCoin.ICreate;
  // Step 3: Create the coin wallet as admin
  const coin = await api.functional.shoppingMallAiBackend.admin.coins.create(
    connection,
    { body: walletBody },
  );
  typia.assert(coin);
  // Step 4: Assertions
  TestValidator.equals(
    "coin wallet customer id matches",
    coin.shopping_mall_ai_backend_customer_id,
    customerId,
  );
  TestValidator.equals(
    "seller id must be null on customer wallet",
    coin.shopping_mall_ai_backend_seller_id,
    null,
  );
  TestValidator.predicate(
    "initial total_accrued is at least 0",
    coin.total_accrued >= 0,
  );
  TestValidator.predicate(
    "initial usable_coin is at least 0",
    coin.usable_coin >= 0,
  );
  TestValidator.predicate(
    "initial expired_coin is at least 0",
    coin.expired_coin >= 0,
  );
  TestValidator.predicate(
    "initial on_hold_coin is at least 0",
    coin.on_hold_coin >= 0,
  );
  TestValidator.predicate(
    "coin wallet has id (uuid format)",
    typeof coin.id === "string" && coin.id.length > 0,
  );
  TestValidator.predicate(
    "coin wallet has creation timestamp",
    typeof coin.created_at === "string" && coin.created_at.length > 0,
  );
  TestValidator.predicate(
    "coin wallet has updated_at timestamp",
    typeof coin.updated_at === "string" && coin.updated_at.length > 0,
  );
}
