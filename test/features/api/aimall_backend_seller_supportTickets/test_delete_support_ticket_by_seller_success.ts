import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Test that a seller can delete their own support ticket successfully.
 *
 * This test verifies that a seller account can create a support ticket and then
 * delete it. Steps:
 *
 * 1. (Precondition) The seller is assumed to be authenticated (connection is
 *    already for a seller account).
 * 2. Create a new support ticket as the seller with valid test data.
 * 3. Delete the created support ticket using its supportTicketId.
 * 4. Confirm that an error is not thrown (erase returns void for success).
 * 5. Edge/business: Retrieval or assertions on the deleted ticket are skipped, as
 *    no by-id retrieval API is provided.
 *
 * This validates both the ability to create and subsequently hard-delete a
 * support ticket as allowed by the permissions/business logic for seller-owned
 * tickets.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_delete_support_ticket_by_seller_success(
  connection: api.IConnection,
) {
  // 1. (Precondition) Seller is authenticated via connection context.

  // 2. Create a support ticket owned by the seller.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ticket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerId,
          subject: "Test seller support ticket for deletion",
          body: "This support ticket is created and will immediately be deleted for E2E testing.",
          priority: "normal",
          category: "support",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 3. Delete the support ticket by ID.
  await api.functional.aimall_backend.seller.supportTickets.erase(connection, {
    supportTicketId: ticket.id,
  });

  // 4. Deletion is confirmed by success: erase() returns void, and if any error is thrown the test will fail.

  // 5. (Edge) Retrieval of deleted ticket would require a GET-by-id API, which is not provided by the current SDK, so omitted.
}
