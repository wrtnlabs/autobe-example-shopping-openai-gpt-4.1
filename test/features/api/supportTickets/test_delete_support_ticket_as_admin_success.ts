import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate successful hard deletion of a support ticket by an administrator.
 *
 * This test verifies that an admin can irreversibly delete a support ticket
 * submitted by a customer. The process involves:
 *
 * 1. Creating a support ticket as a customer (setup step, using POST
 *    /aimall-backend/customer/supportTickets)
 * 2. Deleting the created support ticket as an administrator (using DELETE
 *    /aimall-backend/administrator/supportTickets/{supportTicketId})
 * 3. Confirming that deletion completes successfully (void response, typically a
 *    204 status)
 *
 * Additional notes:
 *
 * - Verification of deletion by attempting to read the ticket afterwards is not
 *   implemented, as no GET endpoint is provided for this resource.
 * - Audit logging validation is not performed, as corresponding endpoints are not
 *   available in the testing scope.
 *
 * The flow ensures end-to-end validation of support ticket lifecycle from
 * creation to hard deletion by privileged user.
 */
export async function test_api_supportTickets_test_delete_support_ticket_as_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a new support ticket as a customer
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const ticket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id: customerId,
          subject: "Account locked after payment",
          body: "My account got locked after I made a payment via mobile. Please assist.",
          priority: "normal",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(ticket);

  // 2. (Authentication context for admin should be set by the test environment; assumed present)
  // Delete the created support ticket as administrator
  await api.functional.aimall_backend.administrator.supportTickets.erase(
    connection,
    {
      supportTicketId: ticket.id,
    },
  );
  // No return value for void/204 endpoints
}
