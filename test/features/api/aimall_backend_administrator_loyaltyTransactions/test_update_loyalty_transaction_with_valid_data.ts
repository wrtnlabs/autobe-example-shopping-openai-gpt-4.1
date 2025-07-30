import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Test updating an existing loyalty transaction with valid administrator
 * changes (allowed updatable fields).
 *
 * This test verifies the administrator's ability to correct or update certain
 * details of a loyalty event (such as the description, point amount, event
 * type, or expiration) using the audit-compliant endpoint.
 *
 * 1. Create an initial loyalty transaction as the data fixture (admin-only
 *    operation).
 * 2. Submit an update for the allowed fields: description, amount, expired_at, and
 *    type.
 * 3. Verify that only the intended fields have changed, while customer_id,
 *    order_id, and coupon_id remain immutable (business/audit rule).
 * 4. Assert that all DTO contract and type rules are respected, and the full
 *    returned record is valid.
 * 5. Additional check: Ensure created_at does not change after update.
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_update_loyalty_transaction_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a loyalty transaction as the test setup
  const createInput = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    coupon_id: typia.random<string & tags.Format<"uuid">>(),
    amount: 1000,
    type: "accrual",
    description: "Initial point grant",
    expired_at: typia.random<string & tags.Format<"date-time">>(),
  } satisfies IAimallBackendLoyaltyTransaction.ICreate;
  const created =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Administrator updates allowed fields (description, amount, type, expired_at)
  const updatePayload = {
    description: "Corrected by admin", // new description
    amount: 1500, // changed point value
    type: "accrual", // remains unchanged for trace, can be changed to another allowed type
    expired_at: typia.random<string & tags.Format<"date-time">>(), // new or changed expiration
  } satisfies IAimallBackendLoyaltyTransaction.IUpdate;

  const updated =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.update(
      connection,
      {
        loyaltyTransactionId: created.id,
        body: updatePayload,
      },
    );
  typia.assert(updated);

  // 3. Verify immutable fields did NOT change
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    created.customer_id,
  );
  TestValidator.equals("order_id unchanged")(updated.order_id)(
    created.order_id,
  );
  TestValidator.equals("coupon_id unchanged")(updated.coupon_id)(
    created.coupon_id,
  );
  // 4. Verify updatable fields
  TestValidator.equals("description updated")(updated.description)(
    updatePayload.description,
  );
  TestValidator.equals("amount updated")(updated.amount)(updatePayload.amount);
  TestValidator.equals("type updated")(updated.type)(updatePayload.type);
  TestValidator.equals("expired_at updated")(updated.expired_at)(
    updatePayload.expired_at,
  );
  // 5. Check that created_at remains unchanged after update
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    created.created_at,
  );
}
