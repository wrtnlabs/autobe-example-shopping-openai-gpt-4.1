import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a seller can view the full details of their own submitted
 * support ticket.
 *
 * This test ensures that after a seller creates a support ticket, they can
 * retrieve all details of that ticket (by supportTicketId) using the GET
 * endpoint. The response is expected to expose all schema-compliant ticket
 * attributes, including:
 *
 * - Status
 * - Subject
 * - Body
 * - Requester_id (should match the seller who created the ticket)
 * - Assignee_admin_id (may be null or present, no access restriction for the
 *   owner)
 * - Priority, category
 * - Created_at, updated_at (timestamps)
 *
 * The test will simulate a seller creating a support ticket, then using the
 * returned id to fetch details, confirming all fields are present, populated,
 * and visible as appropriate for the seller (ticket owner) role.
 *
 * 1. Seller simulates ticket creation with randomized valid data (subject, body,
 *    priority, category, requester_id).
 * 2. Use the API to retrieve ticket detail by the returned ticket id (GET).
 * 3. Validate all critical fields are present and match the expected creation
 *    payload, and the requester_id matches the ticket owner.
 * 4. Ensure that no fields are unexpectedly hidden for the role.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_view_support_ticket_detail_as_ticket_owner_seller(
  connection: api.IConnection,
) {
  // 1. Seller creates a support ticket with random but valid data
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const ticketCreatePayload: IAimallBackendSupportTicket.ICreate = {
    requester_id,
    subject: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    priority: RandomGenerator.pick(["high", "normal", "urgent", "low"]),
    category: RandomGenerator.pick([
      "payment",
      "delivery",
      "product",
      "support",
      "account",
    ]),
    assignee_admin_id: null, // leave unassigned for creation
  };
  const created: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      { body: ticketCreatePayload },
    );
  typia.assert(created);

  // 2. Fetch ticket details by id as the ticket owner
  const read: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.at(connection, {
      supportTicketId: created.id,
    });
  typia.assert(read);

  // 3. Validate all schema fields are present and values match at creation
  TestValidator.equals("ticket id matches creation")(read.id)(created.id);
  TestValidator.equals("requester_id is the ticket owner")(read.requester_id)(
    requester_id,
  );
  TestValidator.equals("subject matches")(read.subject)(
    ticketCreatePayload.subject,
  );
  TestValidator.equals("body matches")(read.body)(ticketCreatePayload.body);
  TestValidator.equals("priority matches")(read.priority)(
    ticketCreatePayload.priority,
  );
  TestValidator.equals("category matches")(read.category)(
    ticketCreatePayload.category,
  );
  // Assignment may be null or unchanged
  TestValidator.equals("assignee_admin_id matches")(read.assignee_admin_id)(
    created.assignee_admin_id,
  );

  // 4. Confirm required status and timestamps are present
  TestValidator.predicate("status defined")(!!read.status);
  TestValidator.predicate("created_at defined")(!!read.created_at);
  TestValidator.predicate("updated_at defined")(!!read.updated_at);
}
