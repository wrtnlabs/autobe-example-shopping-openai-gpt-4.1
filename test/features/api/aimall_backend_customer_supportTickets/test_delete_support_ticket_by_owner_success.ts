import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Test successful deletion of a support ticket by its owner (customer).
 *
 * Business Context:
 *
 * - Customers may create and delete their own support tickets via the API.
 * - Deletion is a hard delete with no recovery/undo available (no soft delete).
 * - An audit log for the deletion is maintained, but audit API is not exposed.
 *
 * Workflow:
 *
 * 1. Create a support ticket as the owner (customer)
 * 2. Delete the support ticket using its id
 * 3. (If API supported) Confirm the record cannot be retrieved (not implemented:
 *    no fetch-by-id endpoint)
 * 4. Ensure the hard delete (irreversible, no undo supported)
 *
 * Notes:
 *
 * - Connection is assumed authenticated as customer
 * - Creation is prerequisite as you can only delete your own tickets
 * - Error assertion for fetch by id is omitted as no such SDK endpoint is present
 * - Audit log and restore/undo logic cannot be validated without further API
 *   support
 */
export async function test_api_aimall_backend_customer_supportTickets_test_delete_support_ticket_by_owner_success(
  connection: api.IConnection,
) {
  // Step 1: Create a support ticket as the owner (customer)
  const ticket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: typia.random<string & tags.Format<"uuid">>(),
          subject: RandomGenerator.paragraph()(1),
          body: RandomGenerator.content()()(),
          priority: "normal",
          category: "product",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // Step 2: Delete the support ticket by its id
  await api.functional.aimall_backend.customer.supportTickets.erase(
    connection,
    {
      supportTicketId: ticket.id,
    },
  );

  // Step 3: No further fetch-by-id API to confirm deletion, so test ends here.
  //         If a fetch-by-id API is ever exposed, add error assertion here.

  // Step 4: No audit log or undo API to verify audit trail or reversibility.
}
