import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSupportTicket";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a seller cannot view customer support tickets they do not own.
 *
 * This test ensures that role-based access control is respected on the seller
 * support ticket listing endpoint. It simulates a scenario where a customer
 * creates a support ticket, and then a seller accesses their own support ticket
 * list. The test confirms that the seller cannot view tickets created by
 * unrelated customers, enforcing data segregation by role.
 *
 * Step-by-step process:
 *
 * 1. Create a support ticket with a (random) customer id via the customer
 *    endpoint.
 * 2. As a seller, list support tickets using the seller-specific endpoint.
 * 3. Assert that the seller's list does not contain the ticket created by the
 *    customer.
 */
export async function test_api_aimall_backend_seller_supportTickets_index_test_seller_cannot_view_customer_tickets(
  connection: api.IConnection,
) {
  // 1. Create a support ticket for a customer
  const unrelatedCustomerId = typia.random<string & tags.Format<"uuid">>();
  const customerTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: unrelatedCustomerId,
          subject: "Customer test ticket (should not be visible to seller)",
          body: "Testing seller data segregation.",
          priority: "normal",
          category: "account",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(customerTicket);

  // 2. As a seller, retrieve ticket list (assume connection now is for a *different* seller)
  const sellerTickets =
    await api.functional.aimall_backend.seller.supportTickets.index(connection);
  typia.assert(sellerTickets);

  // 3. Check that the ticket created by the unrelated customer is NOT visible in seller's ticket list
  TestValidator.predicate("Seller must not see unrelated customer tickets")(
    sellerTickets.data.every((t) => t.requester_id !== unrelatedCustomerId),
  );
}
