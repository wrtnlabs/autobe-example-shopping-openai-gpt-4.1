import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that only the requester (customer A) of a support ticket can access
 * its details, and other customers are denied access.
 *
 * Business context: Support tickets may contain confidential or personally
 * identifiable information. Strict authorization ensures only the ticket
 * creator or legitimate staff/admins can access ticket details, preventing data
 * leakage.
 *
 * Step-by-step process:
 *
 * 1. Simulate/register customer A (unique UUID)
 * 2. Customer A creates a support ticket
 * 3. Simulate/register customer B (different UUID)
 * 4. As customer B, attempt to access the support ticket created by A
 * 5. Verify that the API denies access to customer B (error thrown)
 */
export async function test_api_aimall_backend_customer_supportTickets_test_get_support_ticket_detail_denied_for_non_owner(
  connection: api.IConnection,
) {
  // 1. Simulate/register customer A
  const customerAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Customer A creates a support ticket
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerAId,
          subject: "Delivery issue - package missing item",
          body: "My order #1234 arrived with a missing charger. Please assist.",
          priority: "normal",
          category: "delivery",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 3. Simulate/register customer B
  const customerBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // (Assume connection context can distinguish different users, e.g., via mock headers)

  // 4. As customer B, attempt to fetch support ticket created by A
  // Simulate user context switch to customer B
  connection.headers = { ...connection.headers, "x-mock-user-id": customerBId };
  await TestValidator.error(
    "Non-owner should not access another user's support ticket",
  )(async () => {
    await api.functional.aimall_backend.customer.supportTickets.at(connection, {
      supportTicketId: ticket.id,
    });
  });
}
