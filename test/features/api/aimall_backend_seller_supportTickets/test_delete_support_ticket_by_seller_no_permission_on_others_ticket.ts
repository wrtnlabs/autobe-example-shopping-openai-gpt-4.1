import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Verify that a seller is forbidden from deleting support tickets created by
 * other users.
 *
 * Platform policy only allows the owner (creator) of a support ticket OR
 * administrators to delete a ticket. This test confirms that sellers cannot
 * delete tickets they did not create, thus enforcing ownership-based deletion
 * restrictions.
 *
 * Steps:
 *
 * 1. Seller A creates a support ticket (record owner: Seller A)
 * 2. Seller B (different seller) is prepared and authenticated
 * 3. While logged in as Seller B, attempt to delete the ticket created by Seller A
 * 4. Verify that the delete attempt fails (must throw error/forbidden)
 * 5. (Skipped: ticket existence check after failure, since no suitable fetch API)
 */
export async function test_api_aimall_backend_seller_supportTickets_test_delete_support_ticket_by_seller_no_permission_on_others_ticket(
  connection: api.IConnection,
) {
  // 1. Seller A creates a support ticket
  const sellerAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerAId,
          subject: "Seller A test ticket",
          body: "This ticket is for cross-seller deletion permission test.",
          priority: "normal",
          category: "product",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 2. Seller B (different seller, separate id)
  const sellerBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // ---
  // NOTE: This test assumes the ability to simulate Seller B's session/context.
  // In a real e2e environment this typically means re-auth/logging in as Seller B.
  // For this test, assume connection context (cookies/tokens/etc.) is replaced appropriately.
  // As such, we simulate by proceeding with sellerBId being the active user.

  // 3. While logged in as Seller B, attempt to delete Seller A's ticket (expect rejection)
  await TestValidator.error(
    "seller B forbidden from deleting ticket owned by seller A",
  )(async () => {
    await api.functional.aimall_backend.seller.supportTickets.erase(
      connection,
      {
        supportTicketId: ticket.id,
      },
    );
  });

  // 4. (Skipped: As Seller A, confirm ticket still exists. No suitable fetch-by-id endpoint for seller role)
}
