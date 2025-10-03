import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate update of a deposit transaction by its owning customer.
 *
 * Scenario steps:
 *
 * 1. Register a customer using realistic info
 * 2. Create a deposit account for this customer with reasonable initial values
 * 3. Add a transaction (income/outcome) to the deposit account with a known
 *    initial business_status/reason
 * 4. Update the transaction's business_status and reason fields (as customer is
 *    only allowed to mutate these)
 * 5. Validate the update success: response type, field changes, audit timestamp,
 *    and enforcement that other fields are not changed
 * 6. Ensure all state changes are correctly reflected and business logic is
 *    enforced, including audit trail (updated_at is changed)
 */
export async function test_api_deposit_transaction_update_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const joinBody = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(10),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create a deposit account for the authenticated customer
  const depositBody = {
    shopping_mall_customer_id: customer.id,
    balance: 10000,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    { body: depositBody },
  );
  typia.assert(deposit);

  // 3. Create an initial deposit transaction
  const transactionBody = {
    type: RandomGenerator.pick([
      "income",
      "outcome",
      "refund",
      "admin_adjustment",
    ] as const),
    amount: 5000,
    shopping_mall_customer_id: customer.id,
    business_status: "applied",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      { depositId: deposit.id, body: transactionBody },
    );
  typia.assert(transaction);

  // 4. Update the transaction's business_status and reason
  const updateBody = {
    business_status: "confirmed",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallDepositTransaction.IUpdate;
  const updatedTransaction =
    await api.functional.shoppingMall.customer.deposits.transactions.update(
      connection,
      {
        depositId: deposit.id,
        transactionId: transaction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTransaction);

  // 5. Validate all changes and business logic
  TestValidator.equals(
    "transaction id unchanged after update",
    updatedTransaction.id,
    transaction.id,
  );
  TestValidator.equals(
    "updated business_status reflected",
    updatedTransaction.business_status,
    updateBody.business_status,
  );
  TestValidator.equals(
    "updated reason reflected",
    updatedTransaction.reason,
    updateBody.reason,
  );
  TestValidator.notEquals(
    "updated_at changed by update",
    updatedTransaction.updated_at,
    transaction.updated_at,
  );
  TestValidator.equals(
    "other mutable fields (e.g. amount) remain unchanged",
    updatedTransaction.amount,
    transaction.amount,
  );
  TestValidator.equals(
    "shopping_mall_deposit_id remains unchanged",
    updatedTransaction.shopping_mall_deposit_id,
    transaction.shopping_mall_deposit_id,
  );
  TestValidator.equals(
    "shopping_mall_customer_id remains unchanged",
    updatedTransaction.shopping_mall_customer_id,
    transaction.shopping_mall_customer_id,
  );
  TestValidator.equals(
    "type remains unchanged",
    updatedTransaction.type,
    transaction.type,
  );
}
