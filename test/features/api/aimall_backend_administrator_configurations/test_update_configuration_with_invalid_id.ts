import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Test updating a configuration with a non-existent configurationId returns an
 * error and does not affect existing configurations.
 *
 * This test covers the scenario where an administrator attempts to update a
 * configuration using a UUID that does not exist in the
 * aimall_backend_configurations table. The expectation is that the system
 * should respond with an error (such as 404 Not Found), and existing data
 * should remain unaffected.
 *
 * Step-by-step process:
 *
 * 1. Construct a random (non-existent) UUID value for configurationId.
 * 2. Prepare a valid configuration update payload (for example, new value, key, or
 *    description).
 * 3. Attempt to update the configuration using the non-existent configurationId by
 *    calling the API.
 * 4. Expect the request to fail (throw an error). Verify that the error is
 *    properly handled (using TestValidator.error).
 */
export async function test_api_aimall_backend_administrator_configurations_test_update_configuration_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random (assumed non-existent) configurationId.
  const invalidConfigurationId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid update payload.
  const updatePayload: IAimallBackendConfiguration.IUpdate = {
    value: "new-value",
    description: "Testing update with invalid id",
  };

  // 3 & 4. Attempt the update and expect an error.
  await TestValidator.error(
    "Should throw when updating with non-existent configurationId",
  )(() =>
    api.functional.aimall_backend.administrator.configurations.update(
      connection,
      {
        configurationId: invalidConfigurationId,
        body: updatePayload,
      },
    ),
  );
}
