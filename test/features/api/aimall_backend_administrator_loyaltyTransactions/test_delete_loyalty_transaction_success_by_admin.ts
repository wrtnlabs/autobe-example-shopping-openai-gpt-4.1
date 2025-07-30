import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Validate that an administrator can perform a hard delete of a loyalty
 * transaction.
 *
 * Business context: Occasionally, due to audit correction or compliance
 * requirements, an admin may need to permanently remove a loyalty transaction.
 * This test ensures that the admin can exercise this function, that the
 * deletion is irreversible, and that business rules for audit integrity
 * (logging, privilege checks) are respected.
 *
 * Steps:
 *
 * 1. Create a new loyalty transaction as the admin via POST
 *    /aimall-backend/administrator/loyaltyTransactions
 * 2. Delete the newly created transaction via DELETE
 *    /aimall-backend/administrator/loyaltyTransactions/{loyaltyTransactionId}
 * 3. (Optional, for validation) Attempt to operate on the deleted transaction
 *    (e.g., another delete) and assert not-found error is thrown
 * 4. (If possible) Validate that audit log or compliance notification logic is
 *    triggered (if observable in test, otherwise mention in documentation)
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_delete_loyalty_transaction_success_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a new loyalty transaction as admin to ensure a target exists
  const createInput: IAimallBackendLoyaltyTransaction.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: null,
    coupon_id: null,
    amount: 50.0,
    type: "accrual",
    description: "Audit test creation",
    expired_at: null,
  };
  const transaction =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      { body: createInput },
    );
  typia.assert(transaction);

  // 2. Delete the transaction as admin (irreversible hard delete)
  await api.functional.aimall_backend.administrator.loyaltyTransactions.erase(
    connection,
    { loyaltyTransactionId: transaction.id },
  );

  // 3. Validation: Attempt to delete again and ensure a not-found error is thrown
  await TestValidator.error(
    "Deleting already-deleted loyalty transaction throws not found",
  )(() =>
    api.functional.aimall_backend.administrator.loyaltyTransactions.erase(
      connection,
      { loyaltyTransactionId: transaction.id },
    ),
  );

  // 4. Audit log/compliance check: Not directly testable unless system provides audit log inspection endpoint. Documented for compliance.
}
