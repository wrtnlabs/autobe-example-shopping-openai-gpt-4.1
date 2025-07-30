import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate the seller's ability to list their own support tickets and ensure
 * proper filtering by requester.
 *
 * This test verifies that a seller, after creating multiple support tickets
 * (with different categories and priorities), can retrieve only their own
 * support tickets via the seller's supportTickets index endpoint. It also
 * checks that no tickets from other sellers appear in their list, even if such
 * tickets exist in the system.
 *
 * Steps:
 *
 * 1. SellerA creates multiple support tickets with different categories and
 *    priorities.
 * 2. SellerB creates a support ticket as a control.
 * 3. SellerA retrieves their support ticket list via the seller index endpoint.
 * 4. Assert that every ticket in the list belongs to SellerA (requester_id
 *    matches), not SellerB.
 * 5. Assert that tickets created are present, and SellerB's ticket is not present.
 * 6. Assert that ticket categories and priorities match those created.
 *
 * Note: This test assumes that the seller session context (authentication) is
 * simulated/set via the IConnection; actual role switch or login mechanisms are
 * handled externally by the test harness/environment.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_list_support_tickets_for_seller_multiple_roles(
  connection: api.IConnection,
) {
  // 1. SellerA creates two support tickets with distinct category/priority
  const sellerA_id = typia.random<string & tags.Format<"uuid">>();

  const ticket1 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerA_id,
          subject: "Order not received",
          body: "My shipment hasn't arrived after 10 days.",
          priority: "urgent",
          category: "delivery",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket1);

  const ticket2 =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerA_id,
          subject: "Invoice request",
          body: "Please send an invoice for last month's purchases.",
          priority: "normal",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket2);

  // 2. SellerB creates a support ticket
  const sellerB_id = typia.random<string & tags.Format<"uuid">>();
  const ticketB =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      {
        body: {
          requester_id: sellerB_id,
          subject: "Change payout method",
          body: "I want to switch to bank transfer.",
          priority: "high",
          category: "payment",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticketB);

  // 3. SellerA retrieves their support ticket list
  // (Assume authentication context is for sellerA)
  const page =
    await api.functional.aimall_backend.seller.supportTickets.index(connection);
  typia.assert(page);

  // 4. Assert all tickets listed belong to sellerA
  for (const ticket of page.data) {
    TestValidator.equals("only returns own tickets")(ticket.requester_id)(
      sellerA_id,
    );
  }

  // 5. Assert ticket presence/absence
  const subjects = page.data.map((t) => t.subject);
  TestValidator.predicate("contains Order not received")(
    subjects.includes("Order not received"),
  );
  TestValidator.predicate("contains Invoice request")(
    subjects.includes("Invoice request"),
  );
  TestValidator.predicate("does not include SellerB's ticket")(
    subjects.includes("Change payout method") === false,
  );

  // 6. Assert category/priority coverage
  const priorities = page.data.map((t) => t.priority);
  TestValidator.predicate("contains urgent")(priorities.includes("urgent"));
  TestValidator.predicate("contains normal")(priorities.includes("normal"));
  const categories = page.data.map((t) => t.category);
  TestValidator.predicate("contains delivery")(categories.includes("delivery"));
  TestValidator.predicate("contains account")(categories.includes("account"));
}
