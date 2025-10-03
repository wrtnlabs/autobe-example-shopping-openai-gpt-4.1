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
 * Validate admin updating a deposit transaction, including advanced
 * business/admin fields and audit compliance.
 *
 * Steps:
 *
 * 1. Register admin and customer.
 * 2. Customer creates deposit account.
 * 3. Customer creates transaction on deposit.
 * 4. Switch to admin authentication.
 * 5. Admin updates transaction using advanced admin-allowed fields (status,
 *    business_status, evidence_reference, reversed_at, reason).
 * 6. Confirm all field updates (esp. compliance/audit fields), business logic, and
 *    mutability of allowed fields.
 */
export async function test_api_deposit_transaction_update_admin_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer for deposit ownership
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer creates deposit account
  const deposit: IShoppingMallDeposit =
    await api.functional.shoppingMall.customer.deposits.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        balance: 100000,
        status: "active",
      } satisfies IShoppingMallDeposit.ICreate,
    });
  typia.assert(deposit);

  // 4. Customer creates a deposit transaction
  const depositTx: IShoppingMallDepositTransaction =
    await api.functional.shoppingMall.customer.deposits.transactions.create(
      connection,
      {
        depositId: deposit.id,
        body: {
          type: "income",
          amount: 100000,
          shopping_mall_customer_id: customer.id,
          business_status: "applied",
        } satisfies IShoppingMallDepositTransaction.ICreate,
      },
    );
  typia.assert(depositTx);

  // 5. Switch connection/user context back to admin (to update transaction)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: admin.name,
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 6. Admin updates deposit transaction fields
  const updateBody = {
    business_status: "reversed",
    reason: "Fraud detected, manually reversed transaction.",
    evidence_reference: "AUDIT-12345",
    reversed_at: new Date().toISOString(),
  } satisfies IShoppingMallDepositTransaction.IUpdate;
  const updatedTx: IShoppingMallDepositTransaction =
    await api.functional.shoppingMall.admin.deposits.transactions.update(
      connection,
      {
        depositId: deposit.id,
        transactionId: depositTx.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTx);

  // 7. Validate all updated fields
  TestValidator.equals(
    "business_status updated",
    updatedTx.business_status,
    updateBody.business_status,
  );
  TestValidator.equals("reason updated", updatedTx.reason, updateBody.reason);
  TestValidator.equals(
    "evidence_reference updated",
    updatedTx.evidence_reference,
    updateBody.evidence_reference,
  );
  TestValidator.equals(
    "reversed_at updated",
    updatedTx.reversed_at,
    updateBody.reversed_at,
  );
  // Audit/updated_at must be different (recently updated)
  TestValidator.notEquals(
    "updated_at must differ after update",
    updatedTx.updated_at,
    depositTx.updated_at,
  );
}
