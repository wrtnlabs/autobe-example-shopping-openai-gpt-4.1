import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendDepositTransaction";

export async function test_api_customer_deposit_transaction_detail_success(
  connection: api.IConnection,
) {
  /**
   * 1. Register a new customer (required for deposit access and transaction
   *    ownership).
   */
  const joinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: typia.random<string & tags.Format<"password">>(),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const authResult = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(authResult);
  const customer = authResult.customer;

  /**
   * 2. Retrieve a simulated (valid) deposit and transaction ID belonging to the
   *    test customer. As public API does not expose deposit/transaction
   *    creation or index, use a simulated DTO structure.
   */
  const simulated: IShoppingMallAiBackendDepositTransaction =
    api.functional.shoppingMallAiBackend.customer.deposits.transactions.at.random();
  const depositId: string & tags.Format<"uuid"> =
    simulated.shopping_mall_ai_backend_deposit_id;
  const transactionId: string & tags.Format<"uuid"> = simulated.id;

  /** 3. Query the endpoint for the transaction details as the customer. */
  const transaction: IShoppingMallAiBackendDepositTransaction =
    await api.functional.shoppingMallAiBackend.customer.deposits.transactions.at(
      connection,
      { depositId, transactionId },
    );
  typia.assert(transaction);

  /** 4. Validate all relevant fields: type, amount, balances, and owner linkage. */
  TestValidator.equals("transaction ID matches", transaction.id, transactionId);
  TestValidator.equals(
    "deposit ID matches",
    transaction.shopping_mall_ai_backend_deposit_id,
    depositId,
  );
  TestValidator.equals(
    "customer ID matches test customer",
    transaction.shopping_mall_ai_backend_customer_id,
    customer.id,
  );
  TestValidator.predicate(
    "change_type is non-empty string",
    typeof transaction.change_type === "string" &&
      transaction.change_type.length > 0,
  );
  TestValidator.predicate(
    "amount is a number",
    typeof transaction.amount === "number",
  );
  TestValidator.predicate(
    "balance_before is a number",
    typeof transaction.balance_before === "number",
  );
  TestValidator.predicate(
    "balance_after is a number",
    typeof transaction.balance_after === "number",
  );
  TestValidator.predicate(
    "created_at is ISO timestamp",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(transaction.created_at),
  );
}
