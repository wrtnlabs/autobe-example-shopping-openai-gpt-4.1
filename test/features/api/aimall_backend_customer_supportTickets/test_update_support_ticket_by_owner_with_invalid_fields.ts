import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that the API enforces field-level restrictions when a customer
 * attempts to update their own support ticket, specifically focusing on
 * forbidden fields such as assignment.
 *
 * The expected behavior is that customers should NOT be able to update
 * admin-only fields (e.g., assignee_admin_id).
 *
 * Steps:
 *
 * 1. Create a support ticket as a customer using the POST endpoint.
 * 2. Attempt to update the ticket using the PUT endpoint, this time setting the
 *    forbidden field assignee_admin_id to a new random value (customers
 *    shouldn't be able to assign admins directly).
 * 3. Expect the API to reject this update—capture and assert that an error occurs.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_update_support_ticket_by_owner_with_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Create a support ticket as the customer
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const createInput: IAimallBackendSupportTicket.ICreate = {
    requester_id,
    subject: "Customer - Field restriction test",
    body: "Testing forbidden update as customer.",
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

  // 2. Attempt forbidden update as customer
  const forbiddenAdminId = typia.random<string & tags.Format<"uuid">>();
  const maliciousUpdate: IAimallBackendSupportTicket.IUpdate = {
    subject: ticket.subject + " updated",
    body: ticket.body + " with forbidden assignment.",
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    assignee_admin_id: forbiddenAdminId, // Customers should NOT be able to change assignment
  };
  await TestValidator.error("Customer forbidden to update assignment field")(
    async () => {
      await api.functional.aimall_backend.customer.supportTickets.update(
        connection,
        {
          supportTicketId: ticket.id,
          body: maliciousUpdate,
        },
      );
    },
  );
}
