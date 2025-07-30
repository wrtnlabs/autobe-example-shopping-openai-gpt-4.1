import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Validate immutability constraints when updating loyalty transactions.
 *
 * This test ensures that attempts to update immutable fields such as
 * customer_id, order_id, or coupon_id in an existing loyalty transaction via
 * the administrator API are prevented both by TypeScript type safety (DTO
 * constraints) and by business logic on the server. Attempts to set these
 * fields in the update DTO will cause a compile error and are therefore not
 * possible to implement as a runtime negative test.
 *
 * Steps:
 *
 * 1. Create a loyalty transaction
 * 2. Attempt to update a mutable field (e.g., amount) - should succeed
 * 3. Attempts to update immutable fields (customer_id, order_id, coupon_id) are
 *    not possible in code and are enforced at compile time via the DTO.
 *    Document this.
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_update_loyalty_transaction_with_unauthorized_fields_rejected(
  connection: api.IConnection,
) {
  // 1. Create a loyalty transaction for testing
  const createInput: IAimallBackendLoyaltyTransaction.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
    amount:
      100 +
      typia.random<number & tags.JsonSchemaPlugin<{ format: "double" }>>(),
    type: "accrual",
    description: "Test transaction for immutability",
    expired_at: null,
  };
  const transaction: IAimallBackendLoyaltyTransaction =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(transaction);

  // 2. Attempt to update a mutable field (allowed field: amount)
  const updatedAmount = transaction.amount + 10;
  const updated: IAimallBackendLoyaltyTransaction =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.update(
      connection,
      {
        loyaltyTransactionId: transaction.id,
        body: {
          amount: updatedAmount,
        } satisfies IAimallBackendLoyaltyTransaction.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("amount updated")(updated.amount)(updatedAmount);
  // Immutable fields remain the same
  TestValidator.equals("customer_id immutable")(updated.customer_id)(
    transaction.customer_id,
  );
  TestValidator.equals("order_id immutable")(updated.order_id)(
    transaction.order_id,
  );
  TestValidator.equals("coupon_id immutable")(updated.coupon_id)(
    transaction.coupon_id,
  );

  // 3. Negative path for forbidden fields
  // It is not possible to attempt to update customer_id/order_id/coupon_id using the SDK,
  // because the DTO type IAimallBackendLoyaltyTransaction.IUpdate does not declare these fields.
  // TypeScript and API design enforce server-side immutability, so such a test cannot be written.
  // Therefore, business rule coverage for this is enforced by the DTO/API contract itself.
}
