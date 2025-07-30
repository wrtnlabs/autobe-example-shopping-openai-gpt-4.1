import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate uniqueness constraint on (key, channel_id, section_id) for backend
 * configurations.
 *
 * This test ensures that it is not possible to create two configuration records
 * with exactly the same key, channel_id, and section_id combination.
 *
 * 1. Create a configuration with a specific key, channel, and section (or with
 *    channel/section null).
 * 2. Attempt to create a second configuration with the same key, channel, and
 *    section values.
 * 3. The API should reject the second creation attempt with an error, confirming
 *    uniqueness enforcement at the service level.
 */
export async function test_api_aimall_backend_administrator_configurations_test_create_configuration_with_duplicate_key_scope_combination(
  connection: api.IConnection,
) {
  // 1. Create the initial configuration
  const createInput: IAimallBackendConfiguration.ICreate = {
    key: RandomGenerator.alphaNumeric(16),
    value: RandomGenerator.alphaNumeric(10),
    channel_id: typia.random<string & tags.Format<"uuid">>(), // Use valid uuid
    section_id: typia.random<string & tags.Format<"uuid">>(),
    description: RandomGenerator.paragraph()(),
  };
  const config =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: createInput },
    );
  typia.assert(config);
  TestValidator.equals("key matches")(config.key)(createInput.key);
  TestValidator.equals("channel_id matches")(config.channel_id)(
    createInput.channel_id,
  );
  TestValidator.equals("section_id matches")(config.section_id)(
    createInput.section_id,
  );

  // 2. Attempt to create another configuration with the same (key, channel_id, section_id)
  TestValidator.error("should fail uniqueness constraint")(async () => {
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: { ...createInput } },
    );
  });
}
