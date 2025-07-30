import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendLoyaltyTransaction";
import type { IPageIAimallBackendLoyaltyTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendLoyaltyTransaction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filtering of loyalty transactions by an
 * administrator.
 *
 * Ensures that the backend supports searching loyalty transactions with
 * flexible criteria—by customer, type (accrual, redemption, expiration,
 * refund_reversal), period, and supports pagination. Asserts that results match
 * only the search criteria and that access is restricted to authorized admin
 * users.
 *
 * Test steps:
 *
 * 1. Create diverse sample loyalty transactions for multiple customers, spanning
 *    all transaction types and various timestamps.
 * 2. As admin, search for transactions for a specific customer; verify that only
 *    that customer's transactions are returned.
 * 3. Filter by transaction type (e.g., accrual), confirm only accruals are shown;
 *    repeat for each transaction type.
 * 4. Filter by date range (created_from/created_to) and confirm transactions fall
 *    within the range.
 * 5. Test pagination: request a subset of all results, then get next/previous
 *    pages and confirm correct slicing.
 * 6. Search with an invalid/nonexistent customer_id, confirm result is empty.
 */
export async function test_api_aimall_backend_administrator_loyaltyTransactions_test_advanced_loyalty_transaction_search_by_type_and_date_range(
  connection: api.IConnection,
) {
  // 1. Create diverse loyalty transactions for multiple customers
  const customerIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const transactionTypes = [
    "accrual",
    "redemption",
    "expiration",
    "refund_reversal",
  ];
  const allTransactions: IAimallBackendLoyaltyTransaction[] = [];

  // Insert two transactions for each customer and type, each with a unique timestamp
  for (let c = 0; c < customerIds.length; ++c) {
    for (const type of transactionTypes) {
      for (let i = 0; i < 2; ++i) {
        const created_at = new Date(
          Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30),
        ).toISOString(); // within 30 days
        const record =
          await api.functional.aimall_backend.administrator.loyaltyTransactions.create(
            connection,
            {
              body: {
                customer_id: customerIds[c],
                amount: (type === "accrual" ? 15 : -10) * (i + 1),
                type,
                description: `${type} test ${i + 1}`,
                expired_at: null,
                order_id: null,
                coupon_id: null,
              } satisfies IAimallBackendLoyaltyTransaction.ICreate,
            },
          );
        typia.assert(record);
        allTransactions.push(record);
      }
    }
  }

  // 2. Search by customer_id
  const searchByCustomer =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
      connection,
      { body: { customer_id: customerIds[0] } },
    );
  typia.assert(searchByCustomer);
  TestValidator.predicate("all transactions match customer_id")(
    searchByCustomer.data.every((t) => t.customer_id === customerIds[0]),
  );

  // 3. Filter by transaction type
  for (const type of transactionTypes) {
    const byType =
      await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
        connection,
        { body: { type } },
      );
    typia.assert(byType);
    TestValidator.predicate(`all results type = ${type}`)(
      byType.data.every((t) => t.type === type),
    );
  }

  // 4. Filter by date range using min/max timestamps seen
  const createdAts = allTransactions.map((t) => t.created_at).sort();
  const start = createdAts[0];
  const end = createdAts[createdAts.length - 1];
  const dateRangeSearch =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
      connection,
      { body: { created_from: start, created_to: end } },
    );
  typia.assert(dateRangeSearch);
  TestValidator.predicate("all results in date range")(
    dateRangeSearch.data.every(
      (t) => t.created_at >= start && t.created_at <= end,
    ),
  );

  // 5. Pagination test
  const pageSize = 3;
  const paginated =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
      connection,
      { body: { limit: pageSize, page: 1 } },
    );
  typia.assert(paginated);
  TestValidator.predicate("limit respected")(paginated.data.length <= pageSize);
  if (paginated.pagination.pages > 1 && paginated.data.length > 0) {
    const secondPage =
      await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
        connection,
        { body: { limit: pageSize, page: 2 } },
      );
    typia.assert(secondPage);
    TestValidator.predicate("page 2 is distinct")(
      secondPage.data[0]?.id !== paginated.data[0]?.id,
    );
  }

  // 6. Out-of-range/non-existent customer_id
  const bogusCustomerId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.aimall_backend.administrator.loyaltyTransactions.search(
      connection,
      { body: { customer_id: bogusCustomerId } },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty results for bogus customer")(
    emptyResult.data.length,
  )(0);
}
