import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate support ticket creation error on invalid priority value.
 *
 * This test verifies that the /aimall-backend/customer/supportTickets endpoint
 * enforces value validation on the `priority` field when customers submit a new
 * support ticket. It attempts to create a ticket using an invalid string for
 * priority (not a valid business value), and checks that the API responds with
 * an appropriate validation error and does not create the ticket.
 *
 * Step-by-step process:
 *
 * 1. Prepare a support ticket DTO with all required fields, but use an
 *    intentionally invalid value in the `priority` field (e.g.,
 *    'super-urgent-impossible') instead of a valid value like 'high', 'normal',
 *    or 'urgent'.
 * 2. Call api.functional.aimall_backend.customer.supportTickets.create with this
 *    DTO.
 * 3. Assert that the call fails and returns a validation error indicating the
 *    invalid value, not a created record.
 * 4. Confirm none of the response data resembles a successfully created ticket.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_create_support_ticket_by_customer_with_invalid_priority(
  connection: api.IConnection,
) {
  // 1. Prepare support ticket DTO with invalid priority value
  const input: IAimallBackendSupportTicket.ICreate = {
    requester_id: typia.random<string & tags.Format<"uuid">>(),
    subject: "Order not processed",
    body: "The order #ABC123 has not been delivered despite payment completed.",
    priority: "super-urgent-impossible", // Invalid value
    category: "delivery",
  };

  // 2 & 3. Attempt to create support ticket and expect failure
  await TestValidator.error("invalid priority should trigger validation error")(
    async () => {
      await api.functional.aimall_backend.customer.supportTickets.create(
        connection,
        { body: input },
      );
    },
  );
}
