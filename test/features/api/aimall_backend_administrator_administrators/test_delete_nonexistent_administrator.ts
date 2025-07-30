import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Test error handling when attempting to delete a non-existent administrator by
 * UUID.
 *
 * This test ensures that the DELETE endpoint for administrators at
 * /aimall-backend/administrator/administrators/{administratorId} properly
 * handles attempts to remove an administrator record that does not exist in the
 * database.
 *
 * The scenario validates the following:
 *
 * 1. The API does not allow deletion of phantom/non-existent records, preserving
 *    system integrity.
 * 2. The API responds with an appropriate 404 error to signal the administrator ID
 *    was not found.
 *
 * Test Steps:
 *
 * 1. Construct a random UUID that does not correspond to any real administrator in
 *    the system.
 * 2. Attempt to delete this UUID with the API's erase endpoint.
 * 3. Validate that a 404 error is thrown as expected and no side effects occur.
 */
export async function test_api_aimall_backend_administrator_administrators_test_delete_nonexistent_administrator(
  connection: api.IConnection,
) {
  // Step 1: Generate a random administratorId (UUID format) that does not exist
  const nonexistentAdministratorId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2 & 3: Attempt to delete and ensure 404 error is thrown
  await TestValidator.error(
    "should fail with 404 for non-existent administrator",
  )(async () => {
    await api.functional.aimall_backend.administrator.administrators.erase(
      connection,
      {
        administratorId: nonexistentAdministratorId,
      },
    );
  });
}
