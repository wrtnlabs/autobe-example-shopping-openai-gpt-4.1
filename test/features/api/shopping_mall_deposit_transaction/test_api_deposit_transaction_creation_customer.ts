import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate customer transaction creation (income/outcome) on their deposit
 * wallet.
 *
 * 1. Register a customer
 * 2. Create a deposit (wallet) account for them
 * 3. Create a deposit (income) transaction (type: "income"), observe balance
 *    increases
 * 4. Create a withdrawal (outcome) transaction (type: "outcome"), observe balance
 *    decreases
 * 5. Attempt withdrawal that exceeds the balance, expect error
 * 6. Attempt to create transaction on a different user's deposit, expect error
 * 7. Attempt invalid transaction type, expect error
 * 8. Check evidence_reference recorded
 */
export async function test_api_deposit_transaction_creation_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer/channel
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    shopping_mall_channel_id: channelId,
    email,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);

  // 2. Create customer deposit account
  const depositBody = {
    shopping_mall_customer_id: customer.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    { body: depositBody },
  );
  typia.assert(deposit);
  TestValidator.equals(
    "deposit balance should be 0 after open",
    deposit.balance,
    0,
  );

  // 3. Deposit (income transaction)
  const depositAmount = 10000;
  const depositTx =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: {
          type: "income",
          amount: depositAmount,
          shopping_mall_customer_id: customer.id,
          business_status: "applied",
          reason: RandomGenerator.paragraph(),
          evidence_reference: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(depositTx);
  TestValidator.equals("income tx type", depositTx.type, "income");
  TestValidator.equals("income tx amount", depositTx.amount, depositAmount);
  TestValidator.equals(
    "income tx business_status",
    depositTx.business_status,
    "applied",
  );
  TestValidator.equals(
    "income tx deposit id",
    depositTx.shopping_mall_deposit_id,
    deposit.id,
  );
  TestValidator.equals(
    "income tx customer id",
    depositTx.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "income tx evidence_reference recorded",
    typeof depositTx.evidence_reference,
    "string",
  );

  // 4. Withdrawal (outcome transaction)
  const withdrawalAmount = 4000;
  const withdrawalTx =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: {
          type: "outcome",
          amount: withdrawalAmount,
          shopping_mall_customer_id: customer.id,
          business_status: "applied",
          reason: RandomGenerator.paragraph(),
          evidence_reference: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  typia.assert(withdrawalTx);
  TestValidator.equals("outcome tx type", withdrawalTx.type, "outcome");
  TestValidator.equals(
    "outcome tx amount",
    withdrawalTx.amount,
    withdrawalAmount,
  );
  TestValidator.equals(
    "outcome tx deposit id",
    withdrawalTx.shopping_mall_deposit_id,
    deposit.id,
  );
  TestValidator.equals(
    "outcome tx customer id",
    withdrawalTx.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "outcome tx evidence_reference recorded",
    typeof withdrawalTx.evidence_reference,
    "string",
  );

  // 5. Attempt excessive withdrawal
  await TestValidator.error(
    "should fail on withdrawal exceeding balance",
    async () => {
      await api.functional.shoppingMall.customer.deposits.transactions.create(
        connection,
        {
          depositId: deposit.id,
          body: {
            type: "outcome",
            amount: depositAmount * 10,
            shopping_mall_customer_id: customer.id,
            business_status: "applied",
            reason: RandomGenerator.paragraph(),
            evidence_reference: RandomGenerator.alphaNumeric(10),
          },
        },
      );
    },
  );

  // 6. Attempt transaction on someone else's deposit account
  const otherCustomer = await api.functional.auth.customer.join(connection, {
    body: { ...joinBody, email: typia.random<string & tags.Format<"email">>() },
  });
  typia.assert(otherCustomer);
  const otherDepositBody = {
    shopping_mall_customer_id: otherCustomer.id,
    balance: 0,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const otherDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: otherDepositBody,
    });
  typia.assert(otherDeposit);
  await TestValidator.error(
    "should not allow creating tx on other customer's deposit",
    async () => {
      await api.functional.shoppingMall.customer.deposits.transactions.create(
        connection,
        {
          depositId: otherDeposit.id,
          body: {
            type: "income",
            amount: 999,
            shopping_mall_customer_id: customer.id,
            business_status: "applied",
            reason: RandomGenerator.paragraph(),
            evidence_reference: RandomGenerator.alphaNumeric(10),
          },
        },
      );
    },
  );

  // 7. Attempt invalid transaction type
  await TestValidator.error("should fail on invalid tx type", async () => {
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: {
          type: "not_a_real_type",
          amount: 222,
          shopping_mall_customer_id: customer.id,
          business_status: "applied",
          reason: RandomGenerator.paragraph(),
          evidence_reference: RandomGenerator.alphaNumeric(10),
        },
      },
    );
  });

  // 8. Audit evidence is recorded
  TestValidator.equals(
    "evidence_reference non-empty (income)",
    typeof depositTx.evidence_reference,
    "string",
  );
  TestValidator.equals(
    "evidence_reference non-empty (outcome)",
    typeof withdrawalTx.evidence_reference,
    "string",
  );
}
