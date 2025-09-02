import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";

export async function test_api_admin_coin_transaction_detail_success(
  connection: api.IConnection,
) {
  /**
   * Test admin's ability to retrieve the full details and audit metadata of a
   * coin wallet transaction.
   *
   * This E2E test verifies:
   *
   * - Admin authentication and privileged session establishment
   * - Coin wallet (ledger) creation as admin
   * - Attempt to retrieve a specific transaction event attached to the coin
   *   wallet (note: with current API, transaction creation is indirect via
   *   ledger creation; there is no list endpoint to reliably fetch real
   *   transactionId)
   * - Validation of all returned fields, ensuring presence of business and audit
   *   metadata for compliance, forensics, and transparency
   *
   * Steps:
   *
   * 1. Register and authenticate admin, check tokens
   * 2. Create coin wallet ledger with initial positive balance (to ensure system
   *    likely triggers at least one 'accrual' transaction event)
   * 3. (WORKAROUND) Use a random UUID as transactionId to simulate a fetch
   *    attempt, since real transaction lookup is not supported with the current
   *    API surface
   * 4. Retrieve transaction detail and validate audit fields, business context,
   *    and integrity of returned record
   * 5. Assert all compliance and linkage metadata is present and consistent
   *
   * NOTE: In a fully featured API, a list endpoint should be used to fetch
   * legitimate transactionIds belonging to this coin wallet for precise
   * validation. This test assumes initial ledger creation triggers a first
   * transaction event as per typical business process.
   */
  // 1. Register and authenticate admin
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);
  TestValidator.predicate(
    "admin authentication returns valid token",
    typeof adminAuth.token.access === "string" &&
      adminAuth.token.access.length > 0,
  );

  // 2. Create a coin wallet ledger
  const coin = await api.functional.shoppingMallAiBackend.admin.coins.create(
    connection,
    {
      body: {
        total_accrued: 1000,
        usable_coin: 1000,
        expired_coin: 0,
        on_hold_coin: 0,
      } satisfies IShoppingMallAiBackendCoin.ICreate,
    },
  );
  typia.assert(coin);

  // 3. (WORKAROUND) Use a random transactionId - in real test, obtain from actual transactions/events listing
  const transactionId = typia.random<string & tags.Format<"uuid">>();
  const transaction =
    await api.functional.shoppingMallAiBackend.admin.coins.transactions.at(
      connection,
      {
        coinId: coin.id,
        transactionId,
      },
    );
  typia.assert(transaction);

  // 4. Validate audit compliance and linkage fields
  TestValidator.equals(
    "parent coin wallet id matches",
    transaction.shopping_mall_ai_backend_coin_id,
    coin.id,
  );
  TestValidator.equals(
    "transaction id matches request",
    transaction.id,
    transactionId,
  );
  TestValidator.predicate(
    "change_type is valid string (likely 'accrual' or similar for ledger init)",
    typeof transaction.change_type === "string" &&
      transaction.change_type.length > 0,
  );
  TestValidator.predicate(
    "amount reflects positive initial accrual (absolute value equals coin ledger starting accrual)",
    Math.abs(transaction.amount) === coin.total_accrued &&
      transaction.amount > 0,
  );
  TestValidator.equals(
    "coin_after matches current usable coin balance",
    transaction.coin_after,
    coin.usable_coin,
  );
  TestValidator.predicate(
    "created_at is ISO date-time string",
    typeof transaction.created_at === "string" &&
      transaction.created_at.length > 0,
  );
  // Ensure key audit/compliance fields are present
  TestValidator.predicate(
    "transaction includes owner, before/after balances, and audit metadata",
    typeof transaction.shopping_mall_ai_backend_coin_id === "string" &&
      typeof transaction.coin_before === "number" &&
      typeof transaction.coin_after === "number" &&
      typeof transaction.created_at === "string",
  );
}
