import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSupportTicket } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSupportTicket";

/**
 * Validate error handling when an administrator attempts to view a support
 * ticket using invalid or non-existent IDs.
 *
 * This test ensures that if an administrator tries to fetch a support ticket
 * by:
 *
 * 1. A syntactically valid but non-existent UUID (no ticket with such ID exists),
 *    or
 * 2. A malformed (non-UUID) supportTicketId string,
 *
 * Then the API responds appropriately with either a 404 Not Found or a
 * validation error as per its contract.
 *
 * The test covers:
 *
 * - 404 Not Found for a nonexistent ticket id
 * - Validation or 404 error for an invalid UUID (malformed id)
 * - Ensures no internal error or information leakage in these edge cases
 *
 * Steps:
 *
 * 1. Attempt to fetch a ticket with a random UUID (not expected to exist). Expect
 *    404 error.
 * 2. Attempt to fetch with a syntactically invalid string (not a UUID). Expect
 *    validation error or 404.
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_view_invalid_support_ticket_id_returns_not_found_admin(
  connection: api.IConnection,
) {
  // 1. Attempt with valid UUID that does not exist
  await TestValidator.error("404 not found for valid, nonexistent UUID")(
    async () => {
      await api.functional.aimall_backend.administrator.supportTickets.at(
        connection,
        {
          supportTicketId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 2. Attempt with invalid UUID format (malformed)
  await TestValidator.error("invalid UUID format or 404")(async () => {
    await api.functional.aimall_backend.administrator.supportTickets.at(
      connection,
      {
        supportTicketId: "not-a-uuid" as string & tags.Format<"uuid">,
      },
    );
  });
}
