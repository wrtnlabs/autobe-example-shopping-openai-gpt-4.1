import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDeposit";
import type { IShoppingMallDepositTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDepositTransaction";

/**
 * Validate that a customer can retrieve details for their own deposit
 * transaction and access control is enforced.
 *
 * Steps:
 *
 * 1. Register customer A (join auth)
 * 2. Create deposit account for A
 * 3. Create a deposit transaction for A's deposit account
 * 4. Retrieve transaction details as A and check matches
 * 5. Register customer B
 * 6. Attempt retrieval as B (should error)
 */
export async function test_api_deposit_transaction_detail_customer_access(
  connection: api.IConnection,
) {
  // 1. Register customer A (join)
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerA_join = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA_join);

  // 2. Create deposit for A
  const depositA = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerA_join.id,
        balance: 0,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    },
  );
  typia.assert(depositA);

  // 3. Create deposit transaction for A
  const transactionCreate =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: depositA.id,
        body: {
          type: "income",
          amount: 1000,
          shopping_mall_customer_id: customerA_join.id,
          business_status: "applied",
          reason: "Initial charge",
          evidence_reference: null,
        } satisfies IShoppingMallDepositTransaction.ICreate,
      },
    );
  typia.assert(transactionCreate);

  // 4. Retrieve transaction details as A and assert correctness
  const transactionRead =
    await api.functional.shoppingMall.customer.deposits.transactions.at(
      connection,
      {
        depositId: depositA.id,
        transactionId: transactionCreate.id,
      },
    );
  typia.assert(transactionRead);
  TestValidator.equals(
    "customer id must match",
    transactionRead.shopping_mall_customer_id,
    customerA_join.id,
  );
  TestValidator.equals(
    "deposit id must match",
    transactionRead.shopping_mall_deposit_id,
    depositA.id,
  );
  TestValidator.equals("amount must match", transactionRead.amount, 1000);
  TestValidator.equals("type must match", transactionRead.type, "income");

  // 5. Register customer B
  const customerB_join = await api.functional.auth.customer.join(
    { ...connection, headers: {} },
    {
      body: {
        shopping_mall_channel_id: channelId,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  typia.assert(customerB_join);

  // 6. Attempt to read transaction as B (unauthorized — should error)
  await TestValidator.error(
    "unauthorized customer cannot access another's deposit transaction",
    async () => {
      await api.functional.shoppingMall.customer.deposits.transactions.at(
        connection,
        {
          depositId: depositA.id,
          transactionId: transactionCreate.id,
        },
      );
    },
  );
}
