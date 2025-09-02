import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";

export async function test_api_admin_coin_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validate successful admin retrieval of coin wallet details with full
   * business and audit fields.
   *
   * Steps:
   *
   * 1. Register admin user (to establish Authorization context)
   * 2. Create a coin wallet via the admin
   * 3. Retrieve that coin wallet by its ID
   * 4. Assert all business/audit fields exist and match expected values
   */

  // 1. Register admin user
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${adminUsername}@test.com`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: adminEmail,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  typia.assert(adminJoin.admin);
  typia.assert(adminJoin.token);

  // 2. Create coin wallet
  const coinCreateInput: IShoppingMallAiBackendCoin.ICreate = {
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_coin: 1000,
    expired_coin: 0,
    on_hold_coin: 0,
  };
  const coin = await api.functional.shoppingMallAiBackend.admin.coins.create(
    connection,
    {
      body: coinCreateInput,
    },
  );
  typia.assert(coin);

  // 3. Retrieve coin wallet by ID
  const fetched = await api.functional.shoppingMallAiBackend.admin.coins.at(
    connection,
    {
      coinId: coin.id,
    },
  );
  typia.assert(fetched);

  // 4. Assert all top-level business and audit fields are as expected
  TestValidator.equals("coin.id matches", fetched.id, coin.id);
  TestValidator.equals(
    "coin.total_accrued matches",
    fetched.total_accrued,
    coin.total_accrued,
  );
  TestValidator.equals(
    "coin.usable_coin matches",
    fetched.usable_coin,
    coin.usable_coin,
  );
  TestValidator.equals(
    "coin.expired_coin matches",
    fetched.expired_coin,
    coin.expired_coin,
  );
  TestValidator.equals(
    "coin.on_hold_coin matches",
    fetched.on_hold_coin,
    coin.on_hold_coin,
  );
  TestValidator.equals(
    "created_at is ISO 8601",
    typeof fetched.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is ISO 8601",
    typeof fetched.updated_at,
    "string",
  );
  TestValidator.equals(
    "customer_id matches",
    fetched.shopping_mall_ai_backend_customer_id,
    coin.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "seller_id matches",
    fetched.shopping_mall_ai_backend_seller_id,
    coin.shopping_mall_ai_backend_seller_id,
  );
}
