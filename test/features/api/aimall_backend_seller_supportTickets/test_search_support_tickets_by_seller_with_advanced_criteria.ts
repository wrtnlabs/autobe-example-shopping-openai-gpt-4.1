import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filtering for seller-created support tickets.
 *
 * This E2E test ensures that a seller can retrieve only their own support
 * tickets using complex filter criteria via the advanced PATCH search endpoint.
 * The test exercises filtering by status, priority, category, creation date
 * (range), and pagination. Only the seller’s own tickets should match; attempts
 * to filter on another seller’s tickets must produce empty results.
 *
 * Steps:
 *
 * 1. As a seller, generate a set of support tickets with diverse combinations of
 *    status, priority, and category.
 * 2. Choose meaningful filter criteria (e.g., status 'open', priority 'high',
 *    category 'payment', date within last 5 days).
 * 3. Query using PATCH /aimall-backend/seller/supportTickets with these filters
 *    (with pagination limit).
 * 4. Assert that results show ONLY matching tickets belonging to the seller,
 *    respecting filtering and pagination.
 * 5. Assert that searching for tickets using a different requester_id yields no
 *    results.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_search_support_tickets_by_seller_with_advanced_criteria(
  connection: api.IConnection,
) {
  // 1. Generate seller identifier for ticket creation
  const seller_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Bulk create support tickets with a matrix of statuses, priorities, categories, and timestamps
  const STATUS_OPTIONS = ["open", "pending", "resolved", "closed"];
  const PRIORITY_OPTIONS = ["normal", "high", "urgent"];
  const CATEGORY_OPTIONS = ["payment", "delivery", "product", "account"];

  const createdTickets: IAimallBackendSupportTicket[] = [];
  const baseDate = new Date();

  for (const status of STATUS_OPTIONS) {
    for (const priority of PRIORITY_OPTIONS) {
      for (const category of CATEGORY_OPTIONS) {
        const created_at = new Date(
          baseDate.getTime() -
            Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 10),
        ).toISOString(); // Up to 10 days ago
        const ticket =
          await api.functional.aimall_backend.seller.supportTickets.create(
            connection,
            {
              body: {
                requester_id: seller_id,
                subject: `Advanced Ticket ${status}-${priority}-${category}`,
                body: `E2E test body for ${status}/${priority}/${category}`,
                priority,
                category,
                assignee_admin_id: null,
              } satisfies IAimallBackendSupportTicket.ICreate,
            },
          );
        typia.assert(ticket);
        // Track locally for filter assertions (status/created_at used only for in-memory checks)
        createdTickets.push({ ...ticket, status, created_at });
      }
    }
  }

  // 3. Choose filter: status 'open', priority 'high', category 'payment', created in last 5 days
  const FILTER_STATUS = "open";
  const FILTER_PRIORITY = "high";
  const FILTER_CATEGORY = "payment";
  const now = new Date();
  const fiveDaysAgo = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 5,
  ).toISOString();
  const until = now.toISOString();

  const expectedFiltered = createdTickets.filter(
    (t) =>
      t.status === FILTER_STATUS &&
      t.priority === FILTER_PRIORITY &&
      t.category === FILTER_CATEGORY &&
      t.created_at >= fiveDaysAgo &&
      t.created_at <= until,
  );

  // 4. Perform advanced search with pagination (limit 2 per page)
  const searchReq: IAimallBackendSupportTicket.IRequest = {
    requester_id: seller_id,
    status: FILTER_STATUS,
    priority: FILTER_PRIORITY,
    category: FILTER_CATEGORY,
    create_from: fiveDaysAgo,
    create_to: until,
    page: 1,
    limit: 2,
  };
  const page1 =
    await api.functional.aimall_backend.seller.supportTickets.search(
      connection,
      { body: searchReq },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "all page1 results belong to seller and match filter",
  )(
    page1.data.every(
      (t) =>
        t.requester_id === seller_id &&
        t.status === FILTER_STATUS &&
        t.priority === FILTER_PRIORITY &&
        t.category === FILTER_CATEGORY &&
        t.created_at >= fiveDaysAgo &&
        t.created_at <= until,
    ),
  );
  TestValidator.equals("page1 current")(page1.pagination.current)(1);
  TestValidator.equals("page1 limit")(page1.pagination.limit)(2);

  // 5. Optionally page through more results if available
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.aimall_backend.seller.supportTickets.search(
        connection,
        { body: { ...searchReq, page: 2 } },
      );
    typia.assert(page2);
    TestValidator.equals("page2 current")(page2.pagination.current)(2);
    TestValidator.equals("page2 limit")(page2.pagination.limit)(2);
  }

  // 6. Search for another requester's tickets and confirm none returned
  const other_seller_id = typia.random<string & tags.Format<"uuid">>();
  const otherSearch =
    await api.functional.aimall_backend.seller.supportTickets.search(
      connection,
      {
        body: { ...searchReq, requester_id: other_seller_id },
      },
    );
  typia.assert(otherSearch);
  TestValidator.equals("no results for other seller")(otherSearch.data.length)(
    0,
  );
}
