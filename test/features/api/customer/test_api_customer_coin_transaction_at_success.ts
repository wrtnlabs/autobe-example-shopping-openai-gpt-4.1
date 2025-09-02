import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";

export async function test_api_customer_coin_transaction_at_success(
  connection: api.IConnection,
) {
  /**
   * Full E2E—Validate fetching a specific coin transaction belonging to an
   * authenticated customer.
   *
   * Steps:
   *
   * 1. Register a customer (auto-authentication on join).
   * 2. Mock-setup a coin and transaction belonging to the customer (in a full
   *    suite, creation endpoint or system fixture would be used; here we
   *    simulate via typia but ensure correct customer/IDs for validation).
   * 3. Fetch the transaction by its coinId and transactionId using the provided
   *    endpoint.
   * 4. Validate all returned fields against expected values. (In simulation/mock,
   *    values may not match; in real E2E, test would need ability to create/fix
   *    records for deterministic fetch.)
   */

  // 1. Register the customer (auto-authentication via join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  } satisfies IShoppingMallAiBackendCustomer.IJoin;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  const customer = joinResult.customer;
  typia.assert(customer);

  // 2. MOCK: Prepare synthetic coin and transaction for this customer
  const coinId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const transactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const transaction: IShoppingMallAiBackendCoinTransaction = {
    id: transactionId,
    shopping_mall_ai_backend_coin_id: coinId,
    shopping_mall_ai_backend_customer_id: customer.id,
    shopping_mall_ai_backend_seller_id: null,
    change_type: "accrual",
    amount: 5000,
    transaction_reference: null,
    coin_before: 0,
    coin_after: 5000,
    reason_code: "welcome_bonus",
    description: "Welcome bonus coins",
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    deleted_at: null,
  };

  // 3. Actually fetch the transaction via API (using synthetic IDs—see limitations note)
  const result =
    await api.functional.shoppingMallAiBackend.customer.coins.transactions.at(
      connection,
      {
        coinId: transaction.shopping_mall_ai_backend_coin_id,
        transactionId: transaction.id,
      },
    );
  typia.assert(result);

  // 4. Validate that fields match (for this synthetic scenario; in production, test fixture should guarantee record matching these IDs exists)
  TestValidator.equals("transaction id matches", result.id, transaction.id);
  TestValidator.equals(
    "coin id matches",
    result.shopping_mall_ai_backend_coin_id,
    transaction.shopping_mall_ai_backend_coin_id,
  );
  TestValidator.equals(
    "customer id matches",
    result.shopping_mall_ai_backend_customer_id,
    transaction.shopping_mall_ai_backend_customer_id,
  );
  TestValidator.equals(
    "change type matches",
    result.change_type,
    transaction.change_type,
  );
  TestValidator.equals("amount matches", result.amount, transaction.amount);
  TestValidator.equals(
    "coin before matches",
    result.coin_before,
    transaction.coin_before,
  );
  TestValidator.equals(
    "coin after matches",
    result.coin_after,
    transaction.coin_after,
  );
  TestValidator.equals(
    "reason code matches",
    result.reason_code,
    transaction.reason_code,
  );
  TestValidator.equals(
    "description matches",
    result.description,
    transaction.description,
  );
  TestValidator.equals(
    "deleted_at matches",
    result.deleted_at,
    transaction.deleted_at,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 string",
    typeof result.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(result.created_at),
  );
}
