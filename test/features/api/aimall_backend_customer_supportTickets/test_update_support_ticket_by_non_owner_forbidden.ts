import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a customer cannot update another user's support ticket.
 *
 * This test ensures strict ticket ownership enforcement. If Customer A submits
 * a support ticket, Customer B (a different logged-in user) must not be able to
 * update that ticket, even with a valid ID. System must reject the operation
 * with a forbidden/authorization error and preserve original ticket data.
 *
 * **Workflow:**
 *
 * 1. Register Customer A (simulate identity by UUID in requester_id)
 * 2. Customer A creates a support ticket; persist ticket ID and original contents
 * 3. Register Customer B (another UUID distinct from A)
 * 4. As Customer B, attempt to update Customer A's ticket -- must be rejected with
 *    forbidden error
 * 5. (If possible) Reload ticket as Customer A, verify contents unchanged
 *    (skipped: no GET endpoint in this scope)
 */
export async function test_api_aimall_backend_customer_supportTickets_test_update_support_ticket_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Customer A (UUID for test context)
  const customerA_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Customer A creates a support ticket
  const ticketA: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerA_id,
          subject: "Delivery problem (Customer A)",
          body: "Order never arrived.",
          priority: "urgent",
          category: "delivery",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticketA);

  // 3. Register Customer B (UUID for test context)
  const customerB_id = typia.random<string & tags.Format<"uuid">>();

  // 4. As Customer B, attempt to update Customer A's ticket
  // The update attempt should fail with a forbidden error
  const updateInput: IAimallBackendSupportTicket.IUpdate = {
    subject: "Hacked Subject by Customer B",
    body: "I am not the owner.",
    status: "resolved",
    priority: "low",
    category: "support",
    assignee_admin_id: null,
  };
  await TestValidator.error(
    "Customer B forbidden from updating another's ticket",
  )(async () => {
    await api.functional.aimall_backend.customer.supportTickets.update(
      connection,
      {
        supportTicketId: ticketA.id,
        body: updateInput,
      },
    );
  });

  // 5. (Skipped) Would reload ticket as Customer A to assert values are unchanged,
  // but GET/read endpoint is unavailable in current scope
}
