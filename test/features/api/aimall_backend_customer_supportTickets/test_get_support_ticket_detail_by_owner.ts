import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate customer can retrieve their own support ticket details and that the
 * API response includes all required fields matching the creation data.
 *
 * Business context: Customers should be able to see support tickets they
 * created and view all metadata and content necessary for troubleshooting or
 * status monitoring. This protects user privacy and ensures audit trail
 * compliance by not leaking tickets to non-requesters.
 *
 * Steps:
 *
 * 1. Create a new support ticket as an authenticated customer (using API).
 * 2. Retrieve the ticket with GET by its ID as the same customer.
 * 3. Confirm all major details (subject, body, status, priority, category,
 *    requester_id, timestamps, etc.) correspond between creation and
 *    retrieval.
 * 4. Confirm type safety on responses.
 * 5. (Negative testing for access by non-requester is not possible here, omitted.)
 */
export async function test_api_aimall_backend_customer_supportTickets_test_get_support_ticket_detail_by_owner(
  connection: api.IConnection,
) {
  // 1. Create a new support ticket as this customer
  const createInput: IAimallBackendSupportTicket.ICreate = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    priority: RandomGenerator.pick(["normal", "high", "urgent"]),
    category: RandomGenerator.pick([
      "account",
      "delivery",
      "payment",
      "product",
      "support",
      "other",
    ]),
    assignee_admin_id: null,
  };
  const created: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: createInput,
      },
    );
  typia.assert(created);

  // 2. Retrieve the support ticket details using its ID as same customer
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.at(connection, {
      supportTicketId: created.id,
    });
  typia.assert(ticket);

  // 3. Validate expected schema fields and content
  TestValidator.equals("id matches")(ticket.id)(created.id);
  TestValidator.equals("requester matches")(ticket.requester_id)(
    createInput.requester_id,
  );
  TestValidator.equals("subject matches")(ticket.subject)(createInput.subject);
  TestValidator.equals("body matches")(ticket.body)(createInput.body);
  TestValidator.equals("priority matches")(ticket.priority)(
    createInput.priority,
  );
  TestValidator.equals("category matches")(ticket.category)(
    createInput.category,
  );
  // Status must exist, but may be system-populated (e.g., 'open')
  TestValidator.predicate("status present and string")(
    typeof ticket.status === "string" && ticket.status.length > 0,
  );
  TestValidator.predicate("created_at is ISO string")(
    typeof ticket.created_at === "string" &&
      !Number.isNaN(Date.parse(ticket.created_at)),
  );
  TestValidator.predicate("updated_at is ISO string")(
    typeof ticket.updated_at === "string" &&
      !Number.isNaN(Date.parse(ticket.updated_at)),
  );
  // Assignee may be null or a UUID string
  if (
    ticket.assignee_admin_id !== null &&
    ticket.assignee_admin_id !== undefined
  )
    TestValidator.predicate("assignee_admin_id is uuid string")(
      typeof ticket.assignee_admin_id === "string" &&
        ticket.assignee_admin_id.length > 0,
    );
}
