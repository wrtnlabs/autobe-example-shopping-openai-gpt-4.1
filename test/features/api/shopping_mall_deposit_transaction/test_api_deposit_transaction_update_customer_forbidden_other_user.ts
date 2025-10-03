import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate that a customer cannot update a transaction record belonging to
 * another customer's deposit account.
 *
 * 1. Register customer A
 * 2. Customer A creates deposit
 * 3. Customer A creates a transaction
 * 4. Register customer B
 * 5. As customer B, attempt to update customer A's transaction
 * 6. Expect 403 forbidden error
 */
export async function test_api_deposit_transaction_update_customer_forbidden_other_user(
  connection: api.IConnection,
) {
  // Step 1: Register customer A
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerAInput = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerA = await api.functional.auth.customer.join(connection, {
    body: customerAInput,
  });
  typia.assert(customerA);

  // Step 2: Customer A creates deposit
  const depositAInput = {
    shopping_mall_customer_id: customerA.id,
    balance: 10000,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const depositA = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    { body: depositAInput },
  );
  typia.assert(depositA);

  // Step 3: Customer A creates transaction
  const transactionAInput = {
    type: "income",
    amount: 1000,
    shopping_mall_customer_id: customerA.id,
    business_status: "applied",
    reason: "Initial top-up",
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transactionA =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: depositA.id,
        body: transactionAInput,
      },
    );
  typia.assert(transactionA);

  // Step 4: Register customer B (different account)
  const customerBInput = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customerB = await api.functional.auth.customer.join(connection, {
    body: customerBInput,
  });
  typia.assert(customerB);

  // Step 5: Attempt to update customer A's transaction as customer B
  // This should be forbidden.
  await TestValidator.error(
    "Customer should not update another customer's transaction",
    async () => {
      await api.functional.shoppingMall.customer.deposits.transactions.update(
        connection,
        {
          depositId: depositA.id,
          transactionId: transactionA.id,
          body: {
            business_status: "failed",
            reason: "Unauthorized update attempt by another user",
          } satisfies IShoppingMallDepositTransaction.IUpdate,
        },
      );
    },
  );
}
