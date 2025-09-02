import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";
import type { IPageIShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCoinTransaction";
import type { IPage_IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage_IPagination";

/**
 * Validate retrieval of coin transaction history for a customer wallet.
 *
 * Business scenario:
 *
 * 1. Register and log in a new customer
 * 2. Simulate creation of one customer-owned coin wallet (unique coinId)
 * 3. Simulate several accrue/use transaction events tied to this coin for
 *    validation
 * 4. Call shoppingMallAiBackend/customer/coins/{coinId}/transactions with
 *    patch.
 * 5. Validate:
 *
 *    - Result list only contains transactions for our coinId
 *    - Only for authenticated customer (ownership)
 *    - Paging and filters work (single page, then empty 2nd page)
 *    - All corresponding events have valid coinId/customerId
 *
 * Note: Transaction and coin ledger creation are simulated due to lack of
 * explicit API. This test expects the backend service to return only
 * synthetic test events matching the test coin/account, without
 * legacy/historical records injected by backend/server logic.
 */
export async function test_api_customer_coin_transaction_history_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Customer registration & auto-login
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const joinResp: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: joinInput });
  typia.assert(joinResp);
  const customerId = joinResp.customer.id;

  // Step 2. Simulate new coin ledger creation for this customer
  const coinId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3. Simulate N transaction events for this coin
  const NUM_TRANSACTIONS = 5;
  const events: IShoppingMallAiBackendCoinTransaction[] = ArrayUtil.repeat(
    NUM_TRANSACTIONS,
    (idx) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_ai_backend_coin_id: coinId,
      shopping_mall_ai_backend_customer_id: customerId,
      shopping_mall_ai_backend_seller_id: null,
      change_type: RandomGenerator.pick(["accrue", "use"] as const),
      amount: idx % 2 === 0 ? 1000 : -500,
      transaction_reference: null,
      coin_before: idx === 0 ? 0 : events[idx - 1].coin_after,
      coin_after:
        idx === 0
          ? 1000
          : events[idx - 1].coin_after + (idx % 2 === 0 ? 1000 : -500),
      reason_code: null,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      created_at: new Date(Date.now() + idx * 1000).toISOString() as string &
        tags.Format<"date-time">,
      deleted_at: null,
    }),
  );

  // Step 4. Call patch endpoint for transaction list (page 1)
  const result =
    await api.functional.shoppingMallAiBackend.customer.coins.transactions.index(
      connection,
      {
        coinId,
        body: { shopping_mall_ai_backend_coin_id: coinId, page: 1, limit: 10 },
      },
    );
  typia.assert(result);
  TestValidator.predicate(
    "returned 'data' array in transaction history result",
    Array.isArray(result.data),
  );

  for (const tx of result.data) {
    TestValidator.equals(
      "transaction coinId matches filter",
      tx.shopping_mall_ai_backend_coin_id,
      coinId,
    );
    TestValidator.equals(
      "transaction customerId matches owner",
      tx.shopping_mall_ai_backend_customer_id,
      customerId,
    );
  }

  // Step 5. Check paging - requesting page 2 (should be empty)
  const emptyPage =
    await api.functional.shoppingMallAiBackend.customer.coins.transactions.index(
      connection,
      {
        coinId,
        body: { shopping_mall_ai_backend_coin_id: coinId, page: 2, limit: 10 },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "second page transaction count is zero",
    emptyPage.data.length,
    0,
  );
}
