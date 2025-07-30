import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate that an administrator can update all updatable fields of any support
 * ticket, regardless of ownership or original creator. This checks admin
 * privilege and audit integrity.
 *
 * 1. Create a support ticket as a customer (simulate customer session).
 * 2. Authenticate or escalate privileges to admin.
 * 3. Update the ticket as admin, changing subject, body, status, priority,
 *    category, and assignment fields.
 * 4. Validate the update is accepted and persisted (all fields reflect new
 *    values).
 * 5. (Compliance) Assume, or comment, that audit log is generated – direct
 *    verification may require additional endpoints.
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_update_support_ticket_as_admin_with_full_privileges(
  connection: api.IConnection,
) {
  // 1. Create a support ticket as a customer
  const requester_id = typia.random<string & tags.Format<"uuid">>();
  const customerTicket =
    await api.functional.aimall_backend.customer.supportTickets.create(
      connection,
      {
        body: {
          requester_id,
          subject: "Initial issue by customer",
          body: "Original problem description for troubleshooting.",
          priority: "normal",
          category: "account",
        } satisfies IAimallBackendSupportTicket.ICreate,
      },
    );
  typia.assert(customerTicket);

  // 2. Simulate admin privilege (assume provided connection has admin role)
  // 3. Prepare updated fields for admin update
  const adminUpdate: IAimallBackendSupportTicket.IUpdate = {
    subject: "[ADMIN] Updated: escalated account issue",
    body: "Updated by admin for compliance case and workflow actions.",
    status: "resolved",
    priority: "high",
    category: "account",
    assignee_admin_id: typia.random<string & tags.Format<"uuid">>(), // Assign to a random admin
  };

  // 4. Admin issues the update
  const updatedTicket =
    await api.functional.aimall_backend.administrator.supportTickets.update(
      connection,
      {
        supportTicketId: customerTicket.id,
        body: adminUpdate,
      },
    );
  typia.assert(updatedTicket);
  // All field assertions
  TestValidator.equals("subject updated")(updatedTicket.subject)(
    adminUpdate.subject,
  );
  TestValidator.equals("body updated")(updatedTicket.body)(adminUpdate.body);
  TestValidator.equals("status updated")(updatedTicket.status)(
    adminUpdate.status,
  );
  TestValidator.equals("priority updated")(updatedTicket.priority)(
    adminUpdate.priority,
  );
  TestValidator.equals("category updated")(updatedTicket.category)(
    adminUpdate.category,
  );
  TestValidator.equals("assignee_admin_id updated")(
    updatedTicket.assignee_admin_id,
  )(adminUpdate.assignee_admin_id);
  // Ensure ownership is unchanged
  TestValidator.equals("requester_id unchanged")(updatedTicket.requester_id)(
    customerTicket.requester_id,
  );

  // 5. NOTE: Actual audit logs would require dedicated endpoint or DB access
  // For this E2E test, we can only assert the business observable behaviors
}
