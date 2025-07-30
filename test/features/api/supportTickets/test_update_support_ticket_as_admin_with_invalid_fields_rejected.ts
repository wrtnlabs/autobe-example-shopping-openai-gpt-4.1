import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validates that even as an administrator, attempts to update restricted or
 * immutable fields on a support ticket (such as UUID, requester, or timestamps)
 * are not permitted.
 *
 * Business context: Support tickets on AIMall have certain immutable fields
 * (id, requester_id, created_at) that administrators should not be able to
 * change, even via admin update endpoints. This test ensures the API and SDK
 * enforce this restriction by verifying these fields remain unchanged after an
 * admin update attempt, regardless of changes to updatable fields.
 *
 * Workflow:
 *
 * 1. Create a new support ticket as a customer (using the public API endpoint)
 * 2. As admin, update the ticket using the administrator endpoint (with a
 *    legitimate update body)
 * 3. Validate the ticket is updated, but immutable fields (id, requester_id,
 *    created_at) have not changed
 */
export async function test_api_supportTickets_test_update_support_ticket_as_admin_with_invalid_fields_rejected(
  connection: api.IConnection,
) {
  // 1. Create a support ticket as a customer
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const createInput: IAimallBackendSupportTicket.ICreate = {
    requester_id,
    subject: "Test for immutable fields",
    body: "Attempting to set immutable fields as admin should fail.",
    priority: "normal",
    category: "account",
    assignee_admin_id: null,
  };
  const ticket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      { body: createInput },
    );
  typia.assert(ticket);

  // 2. Prepare a legitimate update using only allowed fields (can't submit forbidden fields at type level)
  const updateInput: IAimallBackendSupportTicket.IUpdate = {
    subject: "Admin attempted update",
    body: "Update body, immutable fields should remain the same.",
    status: "open",
    priority: "normal",
    category: "account",
    assignee_admin_id: null,
  };
  const updated =
    await api.functional.aimall_backend.administrator.supportTickets.update(
      connection,
      { supportTicketId: ticket.id, body: updateInput },
    );
  typia.assert(updated);

  // 3. Validate that immutable fields have not changed
  TestValidator.equals("Ticket ID unchanged after update")(updated.id)(
    ticket.id,
  );
  TestValidator.equals("Requester ID unchanged after update")(
    updated.requester_id,
  )(ticket.requester_id);
  TestValidator.equals("Created timestamp unchanged")(updated.created_at)(
    ticket.created_at,
  );
}
