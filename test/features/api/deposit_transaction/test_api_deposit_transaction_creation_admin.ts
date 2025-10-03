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
 * Validates that an admin can create deposit transactions for a customer's
 * deposit account, while non-admins cannot.
 *
 * Workflow:
 *
 * 1. Register a customer on a randomly generated channel ID.
 * 2. Authenticate as that customer.
 * 3. Create a deposit account for the customer (initial balance 0, status
 *    'active').
 * 4. Register an admin account (unique email/name/password).
 * 5. Authenticate as that admin.
 * 6. As admin, create a deposit transaction for the customer: type
 *    'admin_adjustment', amount 1000, business_status 'applied', reason random,
 *    evidence_reference random string.
 * 7. Validate the transaction record (structure, references, business logic).
 * 8. Switch to the customer session and attempt the same transaction creation
 *    (should fail with error, as only admin can use this endpoint).
 */
export async function test_api_deposit_transaction_creation_admin(
  connection: api.IConnection,
) {
  // 1. Register the customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. Create the customer's deposit account (customer session)
  const customerDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: {
        shopping_mall_customer_id: customerJoin.id,
        balance: 0,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    });
  typia.assert(customerDeposit);

  // 3. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 4. As admin, create a deposit transaction for the customer
  const depositTransactionBody = {
    type: "admin_adjustment",
    amount: 1000,
    shopping_mall_customer_id: customerJoin.id,
    business_status: "applied",
    reason: RandomGenerator.paragraph(),
    evidence_reference: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallDepositTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.admin.deposits.transactions.create(
      connection,
      {
        depositId: customerDeposit.id,
        body: depositTransactionBody,
      },
    );
  typia.assert(transaction);
  TestValidator.equals(
    "deposit id matches",
    transaction.shopping_mall_deposit_id,
    customerDeposit.id,
  );
  TestValidator.equals(
    "customer id matches",
    transaction.shopping_mall_customer_id,
    customerJoin.id,
  );
  TestValidator.equals(
    "transaction type is admin_adjustment",
    transaction.type,
    "admin_adjustment",
  );
  TestValidator.equals(
    "business status is applied",
    transaction.business_status,
    "applied",
  );
  TestValidator.equals("transaction amount matches", transaction.amount, 1000);
  TestValidator.equals(
    "reason matches",
    transaction.reason,
    depositTransactionBody.reason,
  );
  TestValidator.equals(
    "evidence reference matches",
    transaction.evidence_reference,
    depositTransactionBody.evidence_reference,
  );

  // 5. Switch to customer and try to use admin endpoint (should fail)
  // Re-authenticate as customer (restores session)
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channelId,
      email: customerEmail,
      password: depositTransactionBody.reason, // Try using same credentials but should fail
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  await TestValidator.error(
    "non-admin cannot create deposit transaction",
    async () => {
      await api.functional.shoppingMall.admin.deposits.transactions.create(
        connection,
        {
          depositId: customerDeposit.id,
          body: depositTransactionBody,
        },
      );
    },
  );
}
