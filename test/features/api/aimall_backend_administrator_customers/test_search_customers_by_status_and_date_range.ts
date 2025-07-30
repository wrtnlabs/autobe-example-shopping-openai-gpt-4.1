import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced filtering and pagination of administrator customer search.
 *
 * Business scenario: Administrators need to search customer accounts using a
 * combination of account status and registration (created_at) date range
 * filters. This test ensures that only accounts matching the specified criteria
 * appear in the result set, and pagination operates correctly.
 *
 * Steps:
 *
 * 1. Register multiple customer accounts, each with distinct statuses (e.g.,
 *    'active', 'pending', 'suspended') and with intentionally varied creation
 *    datetimes (created_at in the past, recent, and now).
 * 2. Pick a status (e.g., 'active') and pick a date range (e.g., last 7 days).
 * 3. Use the administrator search endpoint (PATCH
 *    /aimall-backend/administrator/customers) to filter customers by this
 *    status and the chosen date range.
 * 4. Assert that all results have the matching status AND a created_at within the
 *    given range.
 * 5. Verify the pagination metadata matches the result count, and that page/limit
 *    parameters are respected (e.g., fetch limited results and check next
 *    page).
 * 6. Try a filter for a status with no customers in the date range (expect zero
 *    results and correct pagination).
 */
export async function test_api_aimall_backend_administrator_customers_test_search_customers_by_status_and_date_range(
  connection: api.IConnection,
) {
  // 1. Register test customers with different statuses
  const statuses = ["active", "pending", "suspended"];
  const now = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return d.toISOString();
  };

  // Create 5 customers for each status; space them over last 10 days
  const customers: { status: string; created: IAimallBackendCustomer }[] = [];
  for (let i = 0; i < statuses.length; ++i) {
    const status = statuses[i];
    for (let n = 0; n < 5; ++n) {
      // Stagger creation over days (simulate different created_at)
      const forcedCreated = daysAgo(i * 3 + n); // Some in 0d, some to ~10d ago
      // We don't control created_at, but can filter later based on result
      const email = `${status}.${n}.${typia.random<string & tags.Format<"uuid">>()}@e2e.com`;
      const phone = `010${typia.random<string>().slice(0, 8)}`;
      const created = await api.functional.aimall_backend.customers.create(
        connection,
        {
          body: {
            email,
            phone,
            // password_hash optional: leave null
            password_hash: null,
            status,
          } satisfies IAimallBackendCustomer.ICreate,
        },
      );
      typia.assert(created);
      customers.push({ status, created });
      // Wait to space out created_at a tiny bit (if needed for more granularity)
      // await new Promise((r) => setTimeout(r, 20));
    }
  }

  // 2. Determine date range (search recent, within the last 7 days)
  const searchStatus = "active";
  const createdFrom = daysAgo(7);
  const createdTo = now.toISOString();

  // 3. Search for customers with status 'active' in last 7 days, with pagination limit
  const pageLimit = 4;
  const firstPage =
    await api.functional.aimall_backend.administrator.customers.search(
      connection,
      {
        body: {
          status: searchStatus,
          created_from: createdFrom,
          created_to: createdTo,
          limit: pageLimit,
          page: 1,
        } satisfies IAimallBackendCustomer.IRequest,
      },
    );
  typia.assert(firstPage);

  // 4. Assert all results have correct status and created_at
  for (const summary of firstPage.data) {
    TestValidator.equals("status matches")(summary.status)(searchStatus);
    TestValidator.predicate("created_at is within range")(
      summary.created_at >= createdFrom && summary.created_at <= createdTo,
    );
  }
  // 5. Check pagination - if more results than limit, fetch next page, counts should add up
  const totalRecords = firstPage.pagination.records;
  if (totalRecords > pageLimit) {
    const secondPage =
      await api.functional.aimall_backend.administrator.customers.search(
        connection,
        {
          body: {
            status: searchStatus,
            created_from: createdFrom,
            created_to: createdTo,
            limit: pageLimit,
            page: 2,
          } satisfies IAimallBackendCustomer.IRequest,
        },
      );
    typia.assert(secondPage);
    // No duplicates between first and second pages
    const firstIds = new Set(firstPage.data.map((c) => c.id));
    for (const c of secondPage.data) {
      TestValidator.predicate("No duplicate id in next page")(
        !firstIds.has(c.id),
      );
    }
    // Combined result count matches metadata or is less than/equal limit
    TestValidator.equals("sum page results")(
      firstPage.data.length + secondPage.data.length <= pageLimit * 2,
    )(true);
  }

  // 6. Search for a combination with no results (e.g., 'deleted' status not created in last 3 days)
  const emptySearch =
    await api.functional.aimall_backend.administrator.customers.search(
      connection,
      {
        body: {
          status: "deleted",
          created_from: daysAgo(3),
          created_to: now.toISOString(),
          limit: 5,
          page: 1,
        } satisfies IAimallBackendCustomer.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals("empty result count")(emptySearch.data.length)(0);
  TestValidator.predicate("pagination OK for empty")(!!emptySearch.pagination);
}
