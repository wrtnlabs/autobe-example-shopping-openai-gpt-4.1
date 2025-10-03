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
 * Validate soft-delete (logical deletion) of a deposit transaction by an admin
 * and related business access rules.
 *
 * 1. Register a new admin (obtain admin session).
 * 2. Register a new customer and obtain customer session.
 * 3. Customer creates a new deposit account.
 * 4. Customer creates a single deposit transaction (e.g., income/adjust).
 * 5. Switch to admin session by admin join (token refreshed).
 * 6. Admin calls admin/deposits/:depositId/transactions/:transactionId erase,
 *    soft-deleting the transaction.
 * 7. Switch back to customer by customer join (token refreshed), attempt to erase
 *    own transaction (expect error: forbidden).
 * 8. Switch back to admin and attempt erase on already erased transaction (should
 *    be idempotent; no error).
 */
export async function test_api_deposit_transaction_erase_admin_success(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain admin token.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "foobar123456",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register customer and obtain customer token.
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "passw0rd",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 3. Customer creates deposit account.
  const deposit = await api.functional.shoppingMall.customer.deposits.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerJoin.id,
        balance: 100000,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    },
  );
  typia.assert(deposit);

  // 4. Customer creates a single deposit transaction.
  const transaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: {
          type: "income",
          amount: 5000,
          shopping_mall_customer_id: customerJoin.id,
          business_status: "applied",
        } satisfies IShoppingMallDepositTransaction.ICreate,
      },
    );
  typia.assert(transaction);
  TestValidator.equals(
    "transaction initially not deleted",
    transaction.deleted_at,
    null,
  );

  // 5. Switch to admin session by performing another admin join
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "foobar123456",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 6. Admin erases (soft-deletes) the transaction
  await api.functional.shoppingMall.admin.deposits.transactions.erase(
    connection,
    {
      depositId: deposit.id,
      transactionId: transaction.id,
    },
  );

  // 7. Switch back to customer session: login/join again
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: "passw0rd",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error("customer cannot erase transaction", async () => {
    await api.functional.shoppingMall.admin.deposits.transactions.erase(
      connection,
      {
        depositId: deposit.id,
        transactionId: transaction.id,
      },
    );
  });

  // 8. Switch back to admin and try to erase again (should be idempotent/no error)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "foobar123456",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await api.functional.shoppingMall.admin.deposits.transactions.erase(
    connection,
    {
      depositId: deposit.id,
      transactionId: transaction.id,
    },
  );
}
