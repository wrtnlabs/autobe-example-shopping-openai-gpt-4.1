import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * Validate retrieval of a specific loyalty transaction by its ID as an
 * administrator.
 *
 * This test verifies the following:
 *
 * 1. Administrator can create a loyalty transaction of each supported type, and
 *    then use the returned ID to fetch the transaction, confirming all fields
 *    match what was written at creation.
 * 2. Retrieving a transaction using a made-up (but syntactically valid) UUID that
 *    does not exist returns a not-found error.
 * 3. Using a malformed (invalid format) UUID yields an appropriate error response
 *    for bad input.
 *
 * PII masking for unauthorized users is mentioned in the scenario but cannot be
 * tested here, as only admin endpoints (requiring role-based authentication)
 * are accessible via this functional harness and no "non-admin" user flow or
 * alternate entrypoint is provided in this context.
 *
 * Steps:
 *
 * 1. Create a loyalty transaction (as administrator).
 * 2. Fetch the created transaction by its ID; check that all returned fields are
 *    exactly as created.
 * 3. Attempt to fetch a transaction using a random (but well-formed) UUID that
 *    does not exist; expect a not-found error.
 * 4. Attempt to fetch a transaction using a malformed UUID; expect a validation
 *    error.
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_retrieve_specific_loyalty_transaction_by_id(
  connection: api.IConnection,
) {
  // 1. Create a loyalty transaction of type 'accrual' as a baseline example
  const createPayload: IAimallBackendLoyaltyTransaction.ICreate = {
    customer_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: null,
    coupon_id: null,
    amount: 1000,
    type: "accrual",
    description: "Test accrual for audit",
    expired_at: null,
  };
  const created: IAimallBackendLoyaltyTransaction =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
      connection,
      { body: createPayload },
    );
  typia.assert(created);
  // 2. Fetch the created transaction by ID
  const fetched =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.at(
      connection,
      {
        loyaltyTransactionId: created.id,
      },
    );
  typia.assert(fetched);
  // Validate all returned fields match on initial creation (except generated id/created_at fields)
  TestValidator.equals("customer_id matches")(fetched.customer_id)(
    createPayload.customer_id,
  );
  TestValidator.equals("order_id matches")(fetched.order_id)(
    createPayload.order_id,
  );
  TestValidator.equals("coupon_id matches")(fetched.coupon_id)(
    createPayload.coupon_id,
  );
  TestValidator.equals("amount matches")(fetched.amount)(createPayload.amount);
  TestValidator.equals("type matches")(fetched.type)(createPayload.type);
  TestValidator.equals("description matches")(fetched.description)(
    createPayload.description,
  );
  TestValidator.equals("expired_at matches")(fetched.expired_at)(
    createPayload.expired_at,
  );

  // 3. Attempt to fetch a transaction using a random (well-formed) UUID that doesn't exist
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Fetching non-existent loyaltyTransactionId throws not found error",
  )(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.at(
      connection,
      { loyaltyTransactionId: nonExistentUUID },
    );
  });

  // 4. Attempt to fetch a transaction with malformed (invalid) UUID
  await TestValidator.error(
    "Malformed loyaltyTransactionId should yield error",
  )(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.at(
      connection,
      { loyaltyTransactionId: "bad-uuid-format" as any },
    );
  });
}
