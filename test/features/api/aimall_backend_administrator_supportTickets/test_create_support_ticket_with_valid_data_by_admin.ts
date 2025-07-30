import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that an administrator can create a new support ticket with valid
 * data.
 *
 * This test ensures that when an administrator submits a support ticket (e.g.,
 * for reporting a system issue) through the creation endpoint, all required
 * fields (requester_id, subject, body, priority, category) are accepted per
 * schema, and optionally an assignee can be set. It also verifies that on
 * creation, the server generates and returns fields such as id, created_at,
 * updated_at, and that the audit-tracking and assignment are reflected in the
 * response.
 *
 * Step-by-step process:
 *
 * 1. Generate valid input data for all required fields (including a UUID for
 *    requester_id)
 * 2. Optionally select an assignee_admin_id (can be null or a valid UUID)
 * 3. Call the support ticket creation endpoint as an administrator
 * 4. Assert that the response contains all the expected fields, including
 *    server-generated id and timestamps
 * 5. Assert that the returned values match the input (where appropriate), and
 *    server-generated audit/assignment info is present
 */
export async function test_api_aimall_backend_administrator_supportTickets_create(
  connection: api.IConnection,
) {
  // 1. Prepare valid ticket input as admin
  const input: IAimallBackendSupportTicket.ICreate = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "System incident: Unavailable resource pool",
    body: "Observed error 503 on resource pool endpoint at 2025-07-29T16:20Z. Immediate investigation required.",
    priority: "urgent",
    category: "support",
    assignee_admin_id: typia.random<string & tags.Format<"uuid">>(), // assign to an admin
  };

  // 2. Create support ticket via admin endpoint
  const ticket =
    await api.functional.aimall_backend.administrator.supportTickets.create(
      connection,
      { body: input },
    );
  typia.assert(ticket);

  // 3. Validate server-generated fields and match with input
  TestValidator.equals("requester_id")(ticket.requester_id)(input.requester_id);
  TestValidator.equals("subject")(ticket.subject)(input.subject);
  TestValidator.equals("body")(ticket.body)(input.body);
  TestValidator.equals("priority")(ticket.priority)(input.priority);
  TestValidator.equals("category")(ticket.category)(input.category);
  TestValidator.equals("assignee_admin_id")(ticket.assignee_admin_id)(
    input.assignee_admin_id,
  );

  // 4. Validate presence and format of server-audit fields
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?$/;
  TestValidator.predicate("id is uuid")(
    typeof ticket.id === "string" && ticket.id.length > 0,
  );
  TestValidator.predicate("created_at is ISO date-time")(
    typeof ticket.created_at === "string" &&
      dateTimeRegex.test(ticket.created_at),
  );
  TestValidator.predicate("updated_at is ISO date-time")(
    typeof ticket.updated_at === "string" &&
      dateTimeRegex.test(ticket.updated_at),
  );

  // 5. Validate status and audit compliance
  TestValidator.predicate("status present and non-empty")(
    typeof ticket.status === "string" && ticket.status.length > 0,
  );
}
