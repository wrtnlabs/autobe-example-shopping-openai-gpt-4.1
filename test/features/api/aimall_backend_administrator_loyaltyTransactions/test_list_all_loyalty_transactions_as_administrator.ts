import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendLoyaltyTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";

/**
 * E2E test for listing all loyalty transactions as an administrator.
 *
 * This test verifies that an administrator can successfully retrieve a
 * complete, paginated list of loyalty transaction records through the API,
 * covering all types—accrual, redemption, expiration, and reversal. The test
 * evaluates data completeness and schema integrity for each transaction type.
 * It performs the following key actions:
 *
 * 1. PREPARE DATA: Create several loyalty transaction events as an administrator
 *    for at least two distinct customers, ensuring variety in customer_id, type
 *    (accrual/redemption/expiration/refund_reversal), and relevant metadata
 *    fields (order_id, coupon_id, etc.).
 * 2. HAPPY PATH: List all loyalty transactions as an authorized administrator.
 *    Confirm that:
 *
 *    - Response returns full pagination metadata and expected structure.
 *    - Returned data covers all created transaction types and customers.
 *    - Each transaction record includes required fields, types, and value
 *         correctness per IAimallBackendLoyaltyTransaction.
 *    - Pagination metadata matches data set size, and data array content matches
 *         records created earlier.
 * 3. ACCESS CONTROL: Attempt to list transactions as a non-administrator/account
 *    lacking permission and confirm that access is denied (error thrown).
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_index(
  connection: api.IConnection,
) {
  // 1. PREPARE DATA: Create multiple transactions for at least two customers, for each type
  const customerA = typia.random<string & tags.Format<"uuid">>();
  const customerB = typia.random<string & tags.Format<"uuid">>();
  const types = [
    "accrual",
    "redemption",
    "expiration",
    "refund_reversal",
  ] as const;
  const createdTxs = [];
  for (const customer of [customerA, customerB]) {
    for (const type of types) {
      const tx =
        await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
          connection,
          {
            body: {
              customer_id: customer,
              order_id:
                Math.random() > 0.5
                  ? typia.random<string & tags.Format<"uuid">>()
                  : null,
              coupon_id:
                Math.random() > 0.5
                  ? typia.random<string & tags.Format<"uuid">>()
                  : null,
              amount:
                type === "redemption" || type === "expiration"
                  ? -Math.abs(typia.random<number>())
                  : Math.abs(typia.random<number>()),
              type,
              description: `${type} test transaction for ${customer}`,
              expired_at:
                type === "expiration"
                  ? new Date(Date.now() + 1e9).toISOString()
                  : null,
            } satisfies IAimallBackendLoyaltyTransaction.ICreate,
          },
        );
      typia.assert(tx);
      createdTxs.push(tx);
    }
  }
  // 2. HAPPY PATH: Fetch and validate
  const page =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.index(
      connection,
    );
  typia.assert(page);
  TestValidator.predicate("pagination.fields")(
    typeof page.pagination.current === "number" &&
      typeof page.pagination.limit === "number" &&
      typeof page.pagination.records === "number" &&
      typeof page.pagination.pages === "number",
  );
  TestValidator.predicate("data.length >= created")(
    page.data.length >= createdTxs.length,
  );
  // All created transactions should be present (by id)
  const createdIds = new Set(createdTxs.map((t) => t.id));
  for (const tx of createdTxs) {
    TestValidator.predicate("transaction is present")(
      page.data.some((d) => d.id === tx.id),
    );
  }
  // Assert schema integrity on all entries
  for (const tx of page.data) {
    typia.assert(tx);
  }
  // 3. ACCESS CONTROL: Simulate non-admin by removing Authorization header
  const anonHeaders = { ...connection.headers };
  if ("Authorization" in anonHeaders) delete anonHeaders["Authorization"];
  const anonymousConnection = { ...connection, headers: anonHeaders };
  await TestValidator.error("non-admin access denied")(async () => {
    await api.functional.aimall_backend.administrator.loyaltyTransactions.index(
      anonymousConnection,
    );
  });
}
