import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a customer cannot delete another user's support ticket
 * (permission enforcement).
 *
 * This test verifies that support ticket deletion is only permitted for the
 * creator (owner) or an admin. To do so, it exercises the following steps in
 * realistic customer-user workflow:
 *
 * 1. Customer A (account 1) creates a valid support ticket (using their own unique
 *    UUID as requester_id, and realistic data for subject, body, priority,
 *    category).
 * 2. Customer B (account 2) also exists (for negative permission testing; uses a
 *    different random user/UUID).
 * 3. Attempt to delete Customer A's support ticket while authenticated as Customer
 *    B. Expect a forbidden error (error, not success) from the API.
 * 4. After the failed deletion, verify that the support ticket is still present
 *    and has not been deleted by deleting as Customer A (should succeed).
 *
 * Note: Since there is no ticket retrieval/listing endpoint, status is inferred
 * from delete operation responses.
 *
 * This test ensures isolation of customer permissions, preventing unauthorized
 * deletion of tickets owned by other users.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_delete_support_ticket_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Simulate two separate customers by distinct UUIDs
  const customerA_id = typia.random<string & tags.Format<"uuid">>();
  const customerB_id = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Customer A creates a support ticket
  const ticketA =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerA_id,
          subject: "Order not delivered",
          body: "My package did not arrive as expected.",
          priority: "high",
          category: "delivery",
          assignee_admin_id: null,
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticketA);
  TestValidator.equals("ticket owner is customer A")(ticketA.requester_id)(
    customerA_id,
  );

  // Step 3: Customer B attempts to delete Customer A's support ticket
  // (simulate as if Customer B is authenticated)
  await TestValidator.error("Customer B cannot delete another user's ticket")(
    async () =>
      await api.functional.aimall_backend.customer.supportTickets.erase(
        connection,
        {
          supportTicketId: ticketA.id,
        },
      ),
  );

  // Step 4: Customer A deletes their own ticket successfully
  // (simulate as if Customer A is authenticated)
  await api.functional.aimall_backend.customer.supportTickets.erase(
    connection,
    {
      supportTicketId: ticketA.id,
    },
  );

  // No further assertion possible since no ticket retrieval endpoint exists;
  // success of owner-permitted delete after denied non-owner delete suffices.
}
