import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate error handling when an administrator attempts to create a support
 * ticket with a missing required field (category).
 *
 * This test ensures that the system enforces validation for all required fields
 * when an administrator creates a support ticket via the POST
 * /aimall-backend/administrator/supportTickets endpoint. If the 'category'
 * field is omitted, the API must return a validation error and refuse creation,
 * confirming business rule enforcement and proper schema validation.
 *
 * Test Steps:
 *
 * 1. Prepare a support ticket creation payload
 *    (IAimallBackendSupportTicket.ICreate) omitting the 'category' property.
 * 2. Attempt to create a new support ticket as an administrator user using the
 *    API.
 * 3. Expect the API to return a validation error indicating the missing 'category'
 *    field, and ensure no ticket is created.
 * 4. Validate that the error is thrown and contains meaningful information (error
 *    existence is sufficient for this test; don't parse error messages).
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_create_support_ticket_admin_missing_category(
  connection: api.IConnection,
) {
  // 1. Prepare valid support ticket payload, but omit 'category' (required field)
  const payload: Omit<IAimallBackendSupportTicket.ICreate, "category"> = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "Test Ticket Missing Category",
    body: "This ticket intentionally omits the category field.",
    priority: "normal",
    // category intentionally omitted
    // assignee_admin_id is optional and not provided
  };

  // 2. Attempt to create the support ticket, expect a validation error
  await TestValidator.error(
    "missing required field 'category' triggers validation error",
  )(async () => {
    await api.functional.aimall_backend.administrator.supportTickets.create(
      connection,
      { body: payload as IAimallBackendSupportTicket.ICreate },
    );
  });
}
