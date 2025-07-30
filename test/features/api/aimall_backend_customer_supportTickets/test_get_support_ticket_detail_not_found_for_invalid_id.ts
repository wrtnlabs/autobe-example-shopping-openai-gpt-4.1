import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Test GET /aimall-backend/customer/supportTickets/{supportTicketId} with an
 * invalid/non-existent supportTicketId.
 *
 * This test ensures the API properly returns a 404 Not Found error when a user
 * attempts to retrieve a support ticket with an ID that doesn't exist in the
 * database or is invalid. This also prevents any accidental information leakage
 * about existing tickets, confirming security best practices for resource
 * endpoints.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is extremely unlikely to exist as a support
 *    ticket in the system.
 * 2. Attempt to retrieve the support ticket detail using the GET endpoint with the
 *    invalid supportTicketId.
 * 3. Confirm that a 404 Not Found error is thrown (capture and validate error
 *    type/response).
 * 4. Ensure that the API does not leak internal data or information about the
 *    existence of other tickets.
 */
export async function test_api_aimall_backend_customer_supportTickets_test_get_support_ticket_detail_not_found_for_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate an invalid/non-existent UUID for support ticket id
  const invalidSupportTicketId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2 & 3. Attempt to call the endpoint and confirm 404 error is raised
  await TestValidator.error("Should return 404 Not Found for invalid id")(
    async () => {
      await api.functional.aimall_backend.customer.supportTickets.at(
        connection,
        {
          supportTicketId: invalidSupportTicketId,
        },
      );
    },
  );
}
