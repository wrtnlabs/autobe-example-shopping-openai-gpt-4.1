import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling when attempting to delete a non-existent support
 * ticket as an administrator.
 *
 * Ensures that when an admin tries to delete a support ticket using a random,
 * unused UUID, the system returns a 404 Not Found error and no actual ticket is
 * deleted. This test only needs to check for error occurrence and does not
 * require any setup or teardown.
 *
 * Steps:
 *
 * 1. Generate a random (non-existent) UUID
 * 2. Attempt to call the DELETE endpoint as admin using this ID
 * 3. Assert that an error is thrown (without examining error type/message)
 */
export async function test_api_aimall_backend_administrator_supportTickets_test_delete_support_ticket_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random unused UUID
  const unusedTicketId = typia.random<string & tags.Format<"uuid">>();

  // 2-3. Attempt to delete and expect an error to be thrown
  await TestValidator.error(
    "Deleting non-existent support ticket should throw error",
  )(async () => {
    await api.functional.aimall_backend.administrator.supportTickets.erase(
      connection,
      { supportTicketId: unusedTicketId },
    );
  });
}
