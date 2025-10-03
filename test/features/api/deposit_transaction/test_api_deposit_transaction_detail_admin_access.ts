import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Ensure that an admin user can retrieve any deposit transaction detail for
 * auditing or compliance.
 *
 * 1. Register a unique customer user for a random channel (simulate channel UUID).
 * 2. Create a deposit account for the customer.
 * 3. Create a deposit transaction on the account (type: income, applied, etc).
 * 4. Register an admin user.
 * 5. As admin, retrieve the transaction detail for the deposit.
 * 6. Validate all core transaction fields for completeness and correctness.
 * 7. As customer, attempt to access the same endpoint (should be forbidden).
 * 8. Confirm that business/audit rules are enforced: admins see all, customers are
 *    forbidden.
 */
export async function test_api_deposit_transaction_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Generate a random channel id and customer registration info
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerJoin = {
    shopping_mall_channel_id: channelId,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  // Register customer
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(customerAuth);

  // 2. Customer creates a deposit account
  const depositCreate = {
    shopping_mall_customer_id: customerAuth.id,
    balance: 1000,
    status: "active",
  } satisfies IShoppingMallDeposit.ICreate;
  const deposit = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    {
      body: depositCreate,
    },
  );
  typia.assert(deposit);

  // 3. Customer creates a deposit transaction (income, applied)
  const transactionCreate = {
    type: "income",
    amount: 500,
    shopping_mall_customer_id: customerAuth.id,
    business_status: "applied",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    evidence_reference: undefined,
    shopping_mall_order_id: undefined,
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: transactionCreate,
      },
    );
  typia.assert(transaction);

  // 4. Register an admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);

  // 5. As admin, access transaction detail
  const adminTxDetail =
    await api.functional.shoppingMall.admin.deposits.transactions.at(
      connection,
      {
        depositId: deposit.id,
        transactionId: transaction.id,
      },
    );
  typia.assert(adminTxDetail);
  TestValidator.equals(
    "admin gets transaction details",
    adminTxDetail.id,
    transaction.id,
  );
  TestValidator.equals(
    "transaction deposit id matches",
    adminTxDetail.shopping_mall_deposit_id,
    deposit.id,
  );
  TestValidator.equals(
    "transaction customer id matches",
    adminTxDetail.shopping_mall_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "transaction type matches",
    adminTxDetail.type,
    transactionCreate.type,
  );
  TestValidator.equals(
    "transaction status matches",
    adminTxDetail.business_status,
    transactionCreate.business_status,
  );
  TestValidator.equals(
    "transaction amount matches",
    adminTxDetail.amount,
    transactionCreate.amount,
  );

  // 6. Switch back to customer by re-joining (simulate losing admin token)
  await api.functional.auth.customer.join(connection, { body: customerJoin });
  // 7. As customer, attempt to access the admin endpoint (should fail)
  await TestValidator.error(
    "customer forbidden to access admin transaction detail",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.at(
        connection,
        {
          depositId: deposit.id,
          transactionId: transaction.id,
        },
      );
    },
  );
}
