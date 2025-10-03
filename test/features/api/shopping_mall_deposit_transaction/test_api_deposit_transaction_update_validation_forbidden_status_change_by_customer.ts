import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate that a customer cannot perform forbidden status change or admin-only
 * updates on their own deposit transaction.
 *
 * Steps:
 *
 * 1. Customer registers and creates their user account.
 * 2. Customer creates a new deposit account (with initial balance/status).
 * 3. Customer creates a valid deposit transaction (e.g., a top-up or eligible
 *    type).
 * 4. Customer attempts to update the deposit transaction's business_status or
 *    status to a forbidden value (e.g., 'reversed' or other admin-reserved
 *    status).
 * 5. The API should reject the request with an error, and the original transaction
 *    data should remain intact and auditable.
 */
export async function test_api_deposit_transaction_update_validation_forbidden_status_change_by_customer(
  connection: api.IConnection,
) {
  // 1. Register as a new customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinRes = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(10),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(joinRes);

  // 2. Customer creates a deposit
  const deposit = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: joinRes.id,
        balance: 10000,
        status: "active",
      },
    },
  );
  typia.assert(deposit);

  // 3. Customer creates a valid deposit transaction
  const txCreateBody = {
    type: "income",
    amount: 10000,
    shopping_mall_customer_id: joinRes.id,
    business_status: "confirmed",
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: txCreateBody,
      },
    );
  typia.assert(transaction);

  // 4. Attempt to update transaction with forbidden status (e.g., set to 'reversed')
  await TestValidator.error(
    "customer cannot perform forbidden transaction status update",
    async () => {
      await api.functional.shoppingMall.customer.deposits.transactions.update(
        connection,
        {
          depositId: deposit.id,
          transactionId: transaction.id,
          body: {
            business_status: "reversed",
          } satisfies IShoppingMallDepositTransaction.IUpdate,
        },
      );
    },
  );

  // 5. (Optionally) Re-fetch the transaction and verify that it is unchanged
  // (Assume no API to fetch single transaction; skip this step if unavailable)
}
