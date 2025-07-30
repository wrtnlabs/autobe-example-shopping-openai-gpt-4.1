import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that attempting to delete a configuration entity with a non-existent
 * or already deleted configurationId returns a 404 Not Found error.
 *
 * This test ensures robust error handling for DELETE requests on the
 * configuration management API. It targets the scenario where an administrator
 * attempts to delete a configuration entity that does not exist or has already
 * been hard deleted. The expected system response is a 404 Not Found error,
 * confirming that the entity cannot be deleted because it does not exist in the
 * database.
 *
 * Steps:
 *
 * 1. Generate a random, likely non-existent UUID (format: string &
 *    tags.Format<"uuid">).
 * 2. Attempt to delete the configuration entity via the erase endpoint using this
 *    configurationId.
 * 3. Assert that a 404 Not Found error is returned.
 * 4. For completeness, repeat the operation with the same UUID to confirm
 *    consistent 404 response for re-deletion.
 */
export async function test_api_aimall_backend_administrator_configurations_test_delete_configuration_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate a random UUID for a non-existent configurationId.
  const nonExistentConfigurationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 2: Attempt deletion and expect a 404 Not Found error.
  await TestValidator.error(
    "should return 404 Not Found when configurationId does not exist",
  )(async () => {
    await api.functional.aimall_backend.administrator.configurations.erase(
      connection,
      { configurationId: nonExistentConfigurationId },
    );
  });

  // Step 3: Repeat the deletion with the same UUID to validate error idempotency.
  await TestValidator.error(
    "should return 404 Not Found when re-deleting the same non-existent configurationId",
  )(async () => {
    await api.functional.aimall_backend.administrator.configurations.erase(
      connection,
      { configurationId: nonExistentConfigurationId },
    );
  });
}
