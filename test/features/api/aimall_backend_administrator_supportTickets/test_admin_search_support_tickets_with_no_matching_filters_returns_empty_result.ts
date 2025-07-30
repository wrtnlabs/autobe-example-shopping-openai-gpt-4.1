import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator search of support tickets with filters that match no
 * records.
 *
 * This negative test ensures the endpoint responds correctly when no tickets
 * are found for given criteria.
 *
 * Step-by-step process:
 *
 * 1. Confirm or assume there are support tickets in the system, but none with the
 *    filter criteria used here.
 * 2. Use PATCH /aimall-backend/administrator/supportTickets with deliberately
 *    non-existent status and category as filters.
 * 3. Assert the returned result set is empty and the pagination metadata reflects
 *    zero records and pages, ensuring correct endpoint behavior for no-match
 *    queries.
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_admin_search_support_tickets_with_no_matching_filters_returns_empty_result(
  connection: api.IConnection,
) {
  // 1. (Precondition: It is assumed that no ticket with our magic filter values exists. DB setup handled outside this e2e.)

  // 2. Execute search with uniquely non-matching filter conditions
  const output =
    await api.functional.aimall_backend.administrator.supportTickets.search(
      connection,
      {
        body: {
          status: "doesnotexist_status",
          category: "doesnotexist_category",
        } satisfies IAimallBackendSupportTicket.IRequest,
      },
    );
  typia.assert(output);

  // 3. Assert that the result set is empty and pagination correctly reflects zero records
  TestValidator.equals("support ticket data array empty")(output.data.length)(
    0,
  );
  TestValidator.equals("pagination record count is zero")(
    output.pagination.records,
  )(0);
  TestValidator.predicate("pagination metadata present and valid")(
    typeof output.pagination.current === "number" &&
      typeof output.pagination.limit === "number" &&
      typeof output.pagination.pages === "number",
  );
}
