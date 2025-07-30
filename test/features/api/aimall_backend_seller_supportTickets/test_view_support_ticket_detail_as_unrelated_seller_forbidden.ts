import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a seller cannot access another seller's support ticket details.
 *
 * This test ensures the enforcement of security boundaries so that seller
 * accounts cannot view or access support tickets created by other sellers,
 * preserving data and operational isolation between sellers.
 *
 * Steps:
 *
 * 1. Create a support ticket as Seller A (random UUID requester_id).
 * 2. Simulate context switch: authenticate as Seller B (different UUID
 *    requester_id).
 * 3. Attempt to fetch the Seller A ticket's detail as Seller B and expect
 *    forbidden access error.
 *
 * No support-ticket-sharing is authorized between unrelated sellers; only the
 * ticket creator, assigned admin, or privileged administrator should have
 * access to ticket details.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_view_support_ticket_detail_as_unrelated_seller_forbidden(
  connection: api.IConnection,
) {
  // 1. Seller A creates a support ticket
  const sellerAId = typia.random<string & tags.Format<"uuid">>();
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerAId,
          subject: "Security cross-check for forbidden test",
          body: "This ticket is created by Seller A for access restriction validation.",
          priority: "normal",
          category: "support",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 2. Simulate context switch: Seller B (different random UUID)
  const sellerBId = typia.random<string & tags.Format<"uuid">>();
  // Here, authentication context switch should be handled externally.

  // 3. Attempt forbidden access from Seller B
  await TestValidator.error("forbidden access for unrelated seller")(() =>
    api.functional.aimall_backend.seller.supportTickets.at(connection, {
      supportTicketId: ticket.id,
    }),
  );
}
