import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that a seller cannot update support ticket restricted fields
 * reserved for admin use.
 *
 * This test ensures that after a seller creates a support ticket, attempts to
 * update fields exclusive to admin (such as assignee_admin_id, and attempting
 * to set privileged statuses) are rejected by the API. The workflow is:
 *
 * 1. The seller creates a new support ticket and retains the returned ticket info.
 * 2. Using the ticket's id, attempts an update including `assignee_admin_id`
 *    (should only be modifiable by admin) and manipulates the `status` to mimic
 *    admin workflows (e.g., setting to resolved/closed) if the business rules
 *    restrict this.
 * 3. Expects the update call to fail and asserts that the seller cannot change
 *    such fields, e.g., by catching the error or verifying unchanged fields via
 *    a subsequent read (if get API is available).
 *
 * If the error provides a response, confirm that no restricted field was
 * updated. If not (e.g., 403 or equivalent error), the test passes as it
 * demonstrates proper enforcement.
 */
export async function test_api_aimall_backend_seller_supportTickets_test_update_support_ticket_by_seller_with_forbidden_fields_rejected(
  connection: api.IConnection,
) {
  // 1. Seller creates new support ticket
  const createInput: IAimallBackendSupportTicket.ICreate = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "API update forbidden fields test",
    body: "Test body to check field update enforcement.",
    priority: "normal",
    category: "support",
    assignee_admin_id: null,
  };
  const ticket: IAimallBackendSupportTicket =
    await api.functional.aimall_backend.seller.supportTickets.create(
      connection,
      { body: createInput },
    );
  typia.assert(ticket);

  // 2. Attempt forbidden update: try to assign an admin and set privileged status
  const forbiddenUpdate: IAimallBackendSupportTicket.IUpdate = {
    subject: "ShouldNotChange-Subject",
    body: "Trying update with forbidden fields.",
    status: "resolved", // assuming sellers are forbidden from resolving own tickets
    priority: "normal",
    category: "support",
    assignee_admin_id: typia.random<string & tags.Format<"uuid">>(), // forbidden
  };

  await TestValidator.error(
    "seller forbidden to assign admin or resolve ticket",
  )(async () => {
    await api.functional.aimall_backend.seller.supportTickets.update(
      connection,
      {
        supportTicketId: ticket.id,
        body: forbiddenUpdate,
      },
    );
  });

  // (Optional, only if ticket read API existed: fetch ticket and verify unchanged fields)
}
