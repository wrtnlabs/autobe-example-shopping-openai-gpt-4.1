import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that unauthorized users cannot delete a support ticket.
 *
 * This test ensures that only the ticket owner (creator) or an administrator
 * can delete a support ticket. Any other user attempting to delete the ticket
 * must receive a forbidden error, and the ticket should remain intact in the
 * system.
 *
 * Steps:
 *
 * 1. As User A, create a support ticket. Store the ticket ID.
 * 2. As User B, who is not the ticket requester or an admin, attempt to delete the
 *    ticket using the admin endpoint.
 * 3. Validate that the API returns an appropriate forbidden or authorization error
 *    (e.g., 403 Forbidden).
 * 4. [If possible] Verify via additional (existing) API or data inspection that
 *    the support ticket was not deleted and remains present.
 * 5. [Edge Case] Optionally check that after failed delete, ticket remains
 *    accessible to the rightful user.
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_delete_support_ticket_without_permission(
  connection: api.IConnection,
) {
  // 1. As User A, create a support ticket
  const userAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ticketInput = {
    requester_id: userAId,
    subject: "Unauthorized Delete Test",
    body: "Testing deletion by non-owner user.",
    priority: "normal",
    category: "support",
  } satisfies IAimallBackendSupportTicket.ICreate;
  const ticket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      { body: ticketInput },
    );
  typia.assert(ticket);

  // 2. Simulate User B (not the owner/admin) via modified connection headers
  const userBConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      // Simulate a different unauthorized user with a new UUID
      "x-user-id": typia.random<string & tags.Format<"uuid">>(),
    },
  };

  // 3. Attempt the deletion as User B and expect a permission error
  await TestValidator.error("Unauthorized user cannot delete support ticket")(
    () =>
      api.functional.aimall_backend.administrator.supportTickets.erase(
        userBConnection,
        { supportTicketId: ticket.id },
      ),
  );

  // 4. Ticket presence verification is omitted as no fetch/list API is provided.
}
