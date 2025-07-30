import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate customer support ticket creation with all required fields.
 *
 * This test ensures that:
 *
 * 1. An authenticated customer can create a support ticket.
 * 2. All mandatory fields (requester_id, subject, body, priority, category) are
 *    passed.
 * 3. The creation response includes server-generated ID, timestamps, and
 *    normalized fields.
 * 4. The created ticket is associated with the customer who submits it.
 * 5. The ticket has the correct initial status (e.g., 'open') and reflects the
 *    requested subject, body, priority, and category.
 *
 * Steps:
 *
 * 1. Prepare (simulate) an authenticated customer session and corresponding UUID.
 * 2. Build valid ticket input: random subject, body, priority, category.
 * 3. Call the create ticket API endpoint.
 * 4. Assert type and structure of response with typia.assert().
 * 5. Validate that response fields match input and server-generated fields are
 *    present (id, created_at, updated_at).
 * 6. Ensure 'requester_id' matches the initiating customer and status is correctly
 *    initialized.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_create_support_ticket_with_valid_data_by_customer(
  connection: api.IConnection,
) {
  // 1. Simulate an authenticated customer UUID (in real usage, customer auth API would set this)
  const customer_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare support ticket creation input
  const input: IAimallBackendSupportTicket.ICreate = {
    requester_id: customer_id,
    subject: "Order not delivered",
    body: "My recent order did not arrive. Please assist.",
    priority: "high",
    category: "delivery",
  };

  // 3. Create the support ticket via API
  const ticket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      { body: input },
    );
  typia.assert(ticket);

  // 4. Validate server-generated fields
  TestValidator.predicate("id is uuid")(
    typeof ticket.id === "string" && ticket.id.length > 0,
  );
  TestValidator.equals("requester_id matches")(ticket.requester_id)(
    customer_id,
  );
  TestValidator.equals("subject matches")(ticket.subject)(input.subject);
  TestValidator.equals("body matches")(ticket.body)(input.body);
  TestValidator.equals("priority matches")(ticket.priority)(input.priority);
  TestValidator.equals("category matches")(ticket.category)(input.category);
  TestValidator.predicate("created_at is ISO string")(
    typeof ticket.created_at === "string" && ticket.created_at.length > 0,
  );
  TestValidator.predicate("updated_at is ISO string")(
    typeof ticket.updated_at === "string" && ticket.updated_at.length > 0,
  );
  TestValidator.equals("initial ticket status")(ticket.status)("open");
}
