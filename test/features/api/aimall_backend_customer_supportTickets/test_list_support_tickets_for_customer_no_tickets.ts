import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate fetching support ticket list as an authenticated customer when no
 * tickets have been created yet.
 *
 * This test ensures that an authenticated customer, with no support tickets in
 * the system, can fetch their support ticket list and that:
 *
 * 1. The API returns a valid pagination structure with the data array empty.
 * 2. No tickets belonging to other customers are leaked or returned.
 *
 * Steps:
 *
 * 1. Invoke the support ticket listing API as an authenticated customer with no
 *    tickets in the system.
 * 2. Assert that the returned list (data array) is empty.
 * 3. Assert that the pagination metadata is valid and reflects zero records/pages.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_list_support_tickets_for_customer_no_tickets(
  connection: api.IConnection,
) {
  // 1. Fetch support ticket list for the customer
  const result =
    await api.functional.aimall_backend.customer.supportTickets.index(
      connection,
    );
  typia.assert(result);

  // 2. Validate that data array is empty (no tickets for customer)
  TestValidator.equals("customer has no support tickets")(result.data.length)(
    0,
  );

  // 3. Validate that pagination metadata reflects zero tickets
  TestValidator.equals("no ticket records")(result.pagination.records)(0);
  TestValidator.equals("no pages")(result.pagination.pages)(0);
}
