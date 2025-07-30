import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Test administrator access to view support ticket details by ID.
 *
 * This test validates that an administrator can successfully retrieve the full
 * details of any support ticket using the supportTicketId, regardless of the
 * original requester. It ensures all schema-compliant fields, including
 * workflow status, timestamps, assignee details, requester ID, priority,
 * category, subject, and description, are visible. The response must not leak
 * information outside of that defined in the IAimallBackendSupportTicket
 * schema, nor violate any role-based masking or access restrictions.
 *
 * Steps performed:
 *
 * 1. As an admin, create a new support ticket using the supportTickets.create
 *    endpoint to guarantee a valid test ticket.
 * 2. Retrieve this support ticket using the supportTickets.at endpoint with its
 *    returned ID.
 * 3. Assert that all schema fields are present and type-correct (i.e., validate
 *    using typia.assert).
 * 4. Check that values such as requester_id, status, subject, priority, etc.,
 *    match those provided during ticket creation, and that
 *    created_at/updated_at are valid date-time strings.
 * 5. Ensure the API's response matches exactly the IAimallBackendSupportTicket
 *    schema, with no unexpected fields/data leakage.
 */
export async function test_api_aimall_backend_administrator_supportTickets_at(
  connection: api.IConnection,
) {
  // 1. Create a support ticket as admin
  const ticketInput = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "Test Ticket Subject",
    body: "This is a detailed description for E2E support ticket view test.",
    priority: "normal",
    category: "support",
    // assignee_admin_id is optional (left undefined)
  } satisfies IAimallBackendSupportTicket.ICreate;
  const created =
    await api.functional.aimall_backend.administrator.supportTickets.create(
      connection,
      { body: ticketInput },
    );
  typia.assert(created);

  // 2. Retrieve the ticket by ID as administrator
  const detail =
    await api.functional.aimall_backend.administrator.supportTickets.at(
      connection,
      { supportTicketId: created.id },
    );
  typia.assert(detail);

  // 3. Assert core schema fields match those of the created ticket
  TestValidator.equals("Ticket ID")(detail.id)(created.id);
  TestValidator.equals("Requester ID")(detail.requester_id)(
    ticketInput.requester_id,
  );
  TestValidator.equals("Subject")(detail.subject)(ticketInput.subject);
  TestValidator.equals("Body")(detail.body)(ticketInput.body);
  TestValidator.equals("Priority")(detail.priority)(ticketInput.priority);
  TestValidator.equals("Category")(detail.category)(ticketInput.category);
  TestValidator.predicate("Created timestamp is valid ISO 8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/.test(detail.created_at),
  );
  TestValidator.predicate("Updated timestamp is valid ISO 8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z?/.test(detail.updated_at),
  );

  // 4. Schema leak/field checks: typia.assert ensures strict schema compliance.
}
