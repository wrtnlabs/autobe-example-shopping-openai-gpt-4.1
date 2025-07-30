import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the advanced search and paginated retrieval of support tickets by a
 * customer.
 *
 * This test ensures that after creating multiple support tickets with varying
 * statuses, priorities, and categories for a single customer, the customer can
 * search their own tickets using filter criteria (status, priority, category)
 * and pagination parameters, and gets correct results.
 *
 * Steps:
 *
 * 1. Create a unique customer UUID (requester_id) for ownership tracking.
 * 2. Create multiple support tickets (6-8) for this customer, covering
 *    combinations of status ('open', 'pending', 'closed'), priority ('high',
 *    'normal', 'urgent'), and category ('payment', 'delivery', 'account').
 * 3. Create additional tickets for a different customer requester_id, to ensure
 *    isolation.
 * 4. As the first customer, search support tickets via PATCH
 *    /aimall-backend/customer/supportTickets using filters (e.g.,
 *    status='open', priority='high', limit=2, page=1).
 * 5. Validate that all returned tickets belong to the requester_id, match the
 *    filter criteria, and pagination metadata is correct.
 * 6. Confirm that tickets from other customers are never present in the result, no
 *    matter the filter.
 * 7. Check pagination by retrieving page 2 and validating no overlaps, proper
 *    `current`, `limit`, `pages`, and `records` values.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_search_support_tickets_by_customer_with_filters_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Generate unique customer requester_ids for test isolation
  const requesterId = typia.random<string & tags.Format<"uuid">>();
  const otherRequesterId = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Create support tickets for test customer across status/priority/category
  const supportTicketMatrix = [
    { status: "open", priority: "high", category: "payment" },
    { status: "open", priority: "high", category: "delivery" },
    { status: "open", priority: "urgent", category: "account" },
    { status: "pending", priority: "normal", category: "delivery" },
    { status: "pending", priority: "urgent", category: "payment" },
    { status: "closed", priority: "high", category: "account" },
    { status: "closed", priority: "normal", category: "support" },
  ];
  const createdTickets = [];
  for (const props of supportTicketMatrix) {
    const ticket =
      await api.functional.aimall_backend.customer.supportTickets.create(
        connection,
        {
          body: {
            requester_id: requesterId,
            subject: `Test: ${props.status}/${props.priority}/${props.category}`,
            body: `Body content for ${props.status} + ${props.priority} + ${props.category}`,
            priority: props.priority,
            category: props.category,
          } satisfies IAimallBackendSupportTicket.ICreate,
        },
      );
    typia.assert(ticket);
    createdTickets.push(ticket);
  }

  // Step 3: Create tickets for unrelated customer to ensure filter correctness
  await api.functional.aimall_backend.customer.supportTickets.create(
    connection,
    {
      body: {
        requester_id: otherRequesterId,
        subject: `Other customer open`,
        body: `Irrelevant ticket`,
        priority: "high",
        category: "payment",
      } satisfies IAimallBackendSupportTicket.ICreate,
    },
  );

  await api.functional.aimall_backend.customer.supportTickets.create(
    connection,
    {
      body: {
        requester_id: otherRequesterId,
        subject: `Other customer pending`,
        body: `Irrelevant ticket`,
        priority: "urgent",
        category: "delivery",
      } satisfies IAimallBackendSupportTicket.ICreate,
    },
  );

  // Step 4: Customer searches their support tickets with filters/pagination
  const filterRequest: IAimallBackendSupportTicket.IRequest = {
    requester_id: requesterId,
    status: "open",
    priority: "high",
    page: 1,
    limit: 2,
  };
  const searchResult =
    await api.functional.aimall_backend.customer.supportTickets.search(
      connection,
      {
        body: filterRequest,
      },
    );
  typia.assert(searchResult);

  // Step 5: Validate results match filter and ownership
  TestValidator.predicate(
    "only tickets matching status and priority and requester_id",
  )(
    searchResult.data.every(
      (t) =>
        t.status === "open" &&
        t.priority === "high" &&
        t.requester_id === requesterId,
    ),
  );
  // Confirm no ticket from other requester_id appears
  TestValidator.predicate("no ticket of other customer")(
    searchResult.data.every((t) => t.requester_id === requesterId),
  );
  // Pagination metadata
  TestValidator.equals("pagination limit")(searchResult.pagination.limit)(2);
  TestValidator.equals("pagination current")(searchResult.pagination.current)(
    1,
  );

  // Step 6: Validate page 2 of results (if total > 2)
  if (searchResult.pagination.pages > 1) {
    const searchResultPage2 =
      await api.functional.aimall_backend.customer.supportTickets.search(
        connection,
        {
          body: { ...filterRequest, page: 2 },
        },
      );
    typia.assert(searchResultPage2);
    TestValidator.equals("pagination page 2")(
      searchResultPage2.pagination.current,
    )(2);
    // No overlapping tickets between page 1 and 2
    const idsPage1 = new Set(searchResult.data.map((t) => t.id));
    const idsPage2 = new Set(searchResultPage2.data.map((t) => t.id));
    TestValidator.predicate("no overlap between page results")(
      Array.from(idsPage1).every((id) => !idsPage2.has(id)),
    );
    // All tickets still match filters and ownership
    TestValidator.predicate("page 2 filtered/owned")(
      searchResultPage2.data.every(
        (t) =>
          t.status === "open" &&
          t.priority === "high" &&
          t.requester_id === requesterId,
      ),
    );
    TestValidator.equals("pagination limit")(
      searchResultPage2.pagination.limit,
    )(2);
  }
}
