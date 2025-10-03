import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Verify that a non-admin (customer role) is forbidden from deleting a deposit
 * transaction via the admin endpoint.
 *
 * Steps:
 *
 * 1. Register a customer using the join API.
 * 2. Create a deposit account for the customer via customer deposit create API.
 * 3. Create a transaction record for that deposit using the customer-facing
 *    transaction creation API.
 * 4. Attempt to erase (soft-delete) the transaction using the admin-only erase
 *    endpoint while signed in as the customer.
 * 5. Assert that the operation fails with forbidden (403) error due to
 *    insufficient permissions (not an admin).
 */
export async function test_api_deposit_transaction_erase_admin_forbidden_non_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = {
    shopping_mall_channel_id: channelId,
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);

  // Step 2: Create deposit for the customer
  const depositCreate = {
    shopping_mall_customer_id: customer.id,
    balance: 10000, // arbitrary positive balance
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: depositCreate,
    });
  typia.assert(deposit);

  // Step 3: Create a deposit transaction for the customer deposit
  const transactionCreate = {
    type: "income",
    amount: 1000,
    shopping_mall_customer_id: customer.id,
    business_status: "applied",
    reason: "Testing deposit income transaction",
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transaction: IShoppingMallDepositTransaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: transactionCreate,
      },
    );
  typia.assert(transaction);

  // Step 4: Attempt to erase the transaction through the admin endpoint as a non-admin (should fail)
  await TestValidator.error(
    "customer cannot erase deposit transaction as admin",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.erase(
        connection,
        {
          depositId: deposit.id,
          transactionId: transaction.id,
        },
      );
    },
  );
}
