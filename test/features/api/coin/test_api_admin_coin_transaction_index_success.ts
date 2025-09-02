import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoin";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import type { IPageIShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoinTransaction";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

export async function test_api_admin_coin_transaction_index_success(
  connection: api.IConnection,
) {
  /**
   * Validate admin retrieval of coin wallet transaction history with
   * pagination, using admin privilege.
   *
   * 1. Register an admin account (establish connection-level Authorization for
   *    admin APIs)
   * 2. Create a new coin wallet (ledger) as admin
   * 3. Query the PATCH /shoppingMallAiBackend/admin/coins/{coinId}/transactions
   *    endpoint with pagination/filter criteria
   * 4. Assert a valid paginated transaction list; pagination fields reflect
   *    request; transaction array contains plausible or empty results
   * 5. If transaction data is present, validate data structure and business
   *    invariants
   */

  // 1. Register admin
  const adminData = {
    username: RandomGenerator.alphabets(8),
    password_hash: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphabets(5)}@admin.com`,
    is_active: true,
    phone_number: null,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminData,
  });
  typia.assert(adminAuthorized);

  // 2. Create coin wallet as admin
  const coinCreateBody = {
    shopping_mall_ai_backend_customer_id: null,
    shopping_mall_ai_backend_seller_id: null,
    total_accrued: 0,
    usable_coin: 0,
    expired_coin: 0,
    on_hold_coin: 0,
  } satisfies IShoppingMallAiBackendCoin.ICreate;
  const coin = await api.functional.shoppingMallAiBackend.admin.coins.create(
    connection,
    { body: coinCreateBody },
  );
  typia.assert(coin);

  // 3. Retrieve coin transactions (paginated, filters)
  const transactionRequest = {
    shopping_mall_ai_backend_coin_id: coin.id,
    page: 1,
    limit: 3,
    // Optionally, set plausible date/time range and change_type to filter
    // Ex: change_type: "accrue", created_from: new Date(...), created_to: new Date(...)
  } satisfies IShoppingMallAiBackendCoinTransaction.IRequest;
  const txnResp =
    await api.functional.shoppingMallAiBackend.admin.coins.transactions.index(
      connection,
      {
        coinId: coin.id,
        body: transactionRequest,
      },
    );
  typia.assert(txnResp);
  TestValidator.equals(
    "pagination current page matches",
    txnResp.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit matches", txnResp.pagination.limit, 3);
  TestValidator.predicate(
    "pagination records not negative",
    txnResp.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages not negative",
    txnResp.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists and is array",
    Array.isArray(txnResp.data),
  );

  if (txnResp.data.length > 0) {
    for (const tr of txnResp.data) {
      typia.assert(tr);
      TestValidator.equals(
        "wallet id matches",
        tr.shopping_mall_ai_backend_coin_id,
        coin.id,
      );
      TestValidator.predicate(
        "amount is number",
        typeof tr.amount === "number",
      );
      TestValidator.predicate(
        "created_at is ISO datetime string",
        typeof tr.created_at === "string" && tr.created_at.length > 0,
      );
      TestValidator.predicate("coin_before >= 0", tr.coin_before >= 0);
      TestValidator.predicate("coin_after >= 0", tr.coin_after >= 0);
      TestValidator.predicate(
        "change_type present",
        typeof tr.change_type === "string" && tr.change_type.length > 0,
      );
    }
  }
}
