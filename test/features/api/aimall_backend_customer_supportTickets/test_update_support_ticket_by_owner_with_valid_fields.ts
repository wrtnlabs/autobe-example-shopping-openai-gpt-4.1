import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate customer update of their own support ticket, modifying allowed
 * fields.
 *
 * Ensures the customer (as creator) can update subject, body, status, priority,
 * or category fields on their support ticket by:
 *
 * 1. Creating a support ticket as a customer (dependency).
 * 2. Issuing a PUT update for that ticket (as the same customer) using a valid
 *    supportTicketId.
 * 3. Updating a subset of fields (e.g., subject and status).
 * 4. Confirming the ticket is updated in the response, matching schema and
 *    validation rules.
 * 5. Business logic: Only allowed fields update, audit/compliance principles
 *    implied.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_update_support_ticket_by_owner_with_valid_fields(
  connection: api.IConnection,
) {
  // 1. Create a new support ticket as dependency
  const createInput: IAimallBackendSupportTicket.ICreate = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "Initial subject - " + RandomGenerator.paragraph()(),
    body: "Initial body - " + RandomGenerator.content()()(),
    priority: RandomGenerator.pick(["normal", "high", "urgent"]),
    category: RandomGenerator.pick([
      "account",
      "order",
      "payment",
      "technical",
      "support",
      "product",
    ]),
    assignee_admin_id: null,
  };
  const created: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // 2. Prepare update: only update subject and status, keep others same
  const updateInput: IAimallBackendSupportTicket.IUpdate = {
    subject: createInput.subject + " (updated)",
    body: createInput.body + "\nAdditional explanation.",
    status: "pending",
    priority: createInput.priority,
    category: createInput.category,
    assignee_admin_id: createInput.assignee_admin_id ?? null,
  };

  // 3. Issue the update request
  const updated: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.update(
      connection,
      {
        supportTicketId: created.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 4. Confirm business logic and data
  TestValidator.equals("ticket id matches")(updated.id)(created.id);
  TestValidator.equals("subject updated")(updated.subject)(updateInput.subject);
  TestValidator.equals("body updated")(updated.body)(updateInput.body);
  TestValidator.equals("status updated")(updated.status)(updateInput.status);
  TestValidator.equals("priority unchanged")(updated.priority)(
    updateInput.priority,
  );
  TestValidator.equals("category unchanged")(updated.category)(
    updateInput.category,
  );
  TestValidator.equals("assignee_admin_id unchanged")(
    updated.assignee_admin_id,
  )(updateInput.assignee_admin_id);
}
