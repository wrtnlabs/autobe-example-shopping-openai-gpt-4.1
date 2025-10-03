import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import type { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";

/**
 * Validate logical (soft) deletion of a mileage transaction by an
 * administrator, enforcing regulatory, compliance, and business integrity
 * constraints.
 *
 * Steps:
 *
 * 1. Register an administrator via /auth/admin/join.
 * 2. Create a mileage account for a random customer using
 *    /shoppingMall/admin/mileages.
 * 3. Add a mileage transaction (type: accrual, status: applied) to the created
 *    account.
 * 4. Logically (soft) delete the created transaction using
 *    /shoppingMall/admin/mileages/{mileageId}/transactions/{transactionId}.
 * 5. Attempt to repeat the erase operation on the deleted transaction and confirm
 *    business error occurs (idempotency & compliance).
 * 6. Attempt to erase a 'finalized' or 'expired' transaction and confirm business
 *    error is raised (regulatory compliance enforced).
 *
 * Each creation/mutation is validated with typia.assert. All error scenarios
 * are verified using TestValidator.error with clear titles and proper
 * async/await usage.
 */
export async function test_api_admin_mileage_transaction_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);

  // 2. Create mileage account
  const mileageBody = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(),
    balance: 100000,
    status: "active",
    expired_at: null,
  } satisfies IShoppingMallMileage.ICreate;
  const mileage = await api.functional.shoppingMall.admin.mileages.create(
    connection,
    { body: mileageBody },
  );
  typia.assert(mileage);

  // 3. Add mileage transaction (type: accrual, status: applied)
  const transactionBody = {
    type: "accrual",
    amount: 20000,
    business_status: "applied",
    reason: "promotion",
    shopping_mall_order_id: null,
    evidence_reference: null,
  } satisfies IShoppingMallMileageTransaction.ICreate;
  const transaction =
    await api.functional.shoppingMall.admin.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: transactionBody,
      },
    );
  typia.assert(transaction);

  // 4. Erase (soft-delete) mileage transaction
  await api.functional.shoppingMall.admin.mileages.transactions.erase(
    connection,
    {
      mileageId: mileage.id,
      transactionId: transaction.id,
    },
  );

  // 5. Attempt to erase already deleted transaction and expect error
  await TestValidator.error(
    "should fail to erase a logically deleted transaction",
    async () => {
      await api.functional.shoppingMall.admin.mileages.transactions.erase(
        connection,
        {
          mileageId: mileage.id,
          transactionId: transaction.id,
        },
      );
    },
  );

  // 6. Create a finalized transaction and attempt erase (should fail)
  const finalizedTransactionBody = {
    type: "accrual",
    amount: 30000,
    business_status: "confirmed",
    reason: "event",
    shopping_mall_order_id: null,
    evidence_reference: null,
  } satisfies IShoppingMallMileageTransaction.ICreate;
  const finalizedTransaction =
    await api.functional.shoppingMall.admin.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: finalizedTransactionBody,
      },
    );
  typia.assert(finalizedTransaction);

  await TestValidator.error(
    "should fail to erase a finalized transaction",
    async () => {
      await api.functional.shoppingMall.admin.mileages.transactions.erase(
        connection,
        {
          mileageId: mileage.id,
          transactionId: finalizedTransaction.id,
        },
      );
    },
  );

  // 7. Create an expired transaction and attempt erase (should fail)
  const expiredTransactionBody = {
    type: "accrual",
    amount: 15000,
    business_status: "expired",
    reason: "expiry simulation",
    shopping_mall_order_id: null,
    evidence_reference: null,
  } satisfies IShoppingMallMileageTransaction.ICreate;
  const expiredTransaction =
    await api.functional.shoppingMall.admin.mileages.transactions.create(
      connection,
      {
        mileageId: mileage.id,
        body: expiredTransactionBody,
      },
    );
  typia.assert(expiredTransaction);

  await TestValidator.error(
    "should fail to erase an expired transaction",
    async () => {
      await api.functional.shoppingMall.admin.mileages.transactions.erase(
        connection,
        {
          mileageId: mileage.id,
          transactionId: expiredTransaction.id,
        },
      );
    },
  );
}
