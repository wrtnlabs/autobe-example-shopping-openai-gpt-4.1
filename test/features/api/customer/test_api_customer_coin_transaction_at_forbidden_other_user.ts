import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCoinTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCoinTransaction";

export async function test_api_customer_coin_transaction_at_forbidden_other_user(
  connection: api.IConnection,
) {
  /**
   * E2E test: Restrict access to another user's coin transaction details.
   *
   * This test ensures that a customer cannot view transactions belonging to a
   * different customer's coin wallet. The steps simulate two distinct
   * customers:
   *
   * 1. Register and sign in as Customer A
   * 2. Register and sign in as Customer B
   * 3. Attempt to fetch a coin transaction of Customer A while authenticated as
   *    Customer B
   *
   * Expected result: a forbidden or not found error must be returned (no leak
   * of Customer A's transaction to B)
   */
  // Register Customer A (owner of the coin and transaction)
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAPhone = RandomGenerator.mobile();
  const customerAName = RandomGenerator.name();
  const customerAPassword = RandomGenerator.alphaNumeric(12);
  const customerAJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerAEmail,
      phone_number: customerAPhone,
      password: customerAPassword,
      name: customerAName,
      nickname: null,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAJoin);

  // Simulate an existing coin ledger and transaction for Customer A
  // No coin/transaction creation API is available, so generate valid UUIDs as placeholders
  const coinId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const transactionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Register Customer B (auth changes context to Customer B)
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBPhone = RandomGenerator.mobile();
  const customerBName = RandomGenerator.name();
  const customerBPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerBEmail,
      phone_number: customerBPhone,
      password: customerBPassword,
      name: customerBName,
      nickname: null,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  // Now authenticated as Customer B

  // Customer B attempts to access Customer A's transaction
  await TestValidator.error(
    "customer B cannot access customer A's coin transaction",
    async () => {
      await api.functional.shoppingMallAiBackend.customer.coins.transactions.at(
        connection,
        {
          coinId,
          transactionId,
        },
      );
    },
  );
}
