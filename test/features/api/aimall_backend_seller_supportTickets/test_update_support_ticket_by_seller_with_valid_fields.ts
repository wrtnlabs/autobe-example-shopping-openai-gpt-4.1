import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Test seller support ticket update for own ticket (valid fields).
 *
 * This function verifies that a seller is able to update the allowed fields of
 * a support ticket that they created via the seller API. It covers full CRUD
 * flow relevant for a seller's own ticket:
 *
 * 1. Create a new support ticket as a seller (using the create endpoint, with the
 *    seller as the requester_id).
 * 2. Update editable fields on the ticket (e.g., change subject and category;
 *    other fields remain same).
 * 3. Validate the API returns the updated ticket, and that updated fields match,
 *    while immutable fields (like id, requester_id, timestamps) remain
 *    consistent.
 * 4. Bonus: Validate that updated_at timestamp increases after update.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_update_support_ticket_by_seller_with_valid_fields(
  connection: api.IConnection,
) {
  // 1. Create a seller support ticket
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const orig_subject = "Original subject for test case";
  const orig_body = "Initial ticket body (test scenario)";
  const orig_priority = "normal";
  const orig_category = "delivery";
  const ticket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id,
          subject: orig_subject,
          body: orig_body,
          priority: orig_priority,
          category: orig_category,
          // assignee_admin_id not set (null/undefined)
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 2. Attempt to update subject and category fields via the seller update endpoint
  const new_subject = "Updated subject via API";
  const new_category = "payment";
  const updateInput: IAimallBackendSupportTicket.IUpdate = {
    subject: new_subject,
    body: ticket.body, // Keep same body
    status: ticket.status,
    priority: ticket.priority,
    category: new_category,
    // assignee_admin_id not set
  };
  const updated =
    await api.functional.aimall_backend.seller.supportTickets.update(
      connection,
      {
        supportTicketId: ticket.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 3. Validate updated fields and immutables
  TestValidator.equals("ticket id should not change")(updated.id)(ticket.id);
  TestValidator.equals("ticket requester_id unchanged")(updated.requester_id)(
    ticket.requester_id,
  );
  TestValidator.equals("subject updated")(updated.subject)(new_subject);
  TestValidator.equals("category updated")(updated.category)(new_category);
  TestValidator.equals("body unchanged")(updated.body)(ticket.body);
  TestValidator.equals("priority unchanged")(updated.priority)(ticket.priority);
  TestValidator.equals("status unchanged")(updated.status)(ticket.status);
  TestValidator.predicate("updated_at timestamp increased")(
    new Date(updated.updated_at).getTime() >
      new Date(ticket.updated_at).getTime(),
  );
}
