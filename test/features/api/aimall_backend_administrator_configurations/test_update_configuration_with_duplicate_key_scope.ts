import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate uniqueness constraint enforcement when updating backend
 * configurations.
 *
 * This test confirms that updating a configuration to have the same (key,
 * channel_id, section_id) as another configuration is properly rejected by the
 * API, ensuring uniqueness at the database level.
 *
 * Steps:
 *
 * 1. Create the first configuration with a unique key, channel_id, and section_id.
 * 2. Create the second configuration with a different key and same channel/section
 *    scope.
 * 3. Attempt to update the second configuration to use the same (key, channel_id,
 *    section_id) as the first.
 * 4. Confirm that an error is thrown and the update is rejected due to a
 *    uniqueness violation.
 */
export async function test_api_aimall_backend_administrator_configurations_test_update_configuration_with_duplicate_key_scope(
  connection: api.IConnection,
) {
  // 1. Create the first configuration (baseline for uniqueness)
  const key = "test_conf_key_" + RandomGenerator.alphaNumeric(6);
  const channel_id = typia.random<string & tags.Format<"uuid">>();
  const section_id = typia.random<string & tags.Format<"uuid">>();
  const config1 =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key,
          value: "A",
          channel_id,
          section_id,
          description: "First config for uniqueness test",
        } satisfies IAimallBackendConfiguration.ICreate,
      },
    );
  typia.assert(config1);

  // 2. Create the second configuration with a different key and same channel/section scope
  const config2 =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: key + "_alt",
          value: "B",
          channel_id,
          section_id,
          description: "Second config for uniqueness conflict attempt",
        } satisfies IAimallBackendConfiguration.ICreate,
      },
    );
  typia.assert(config2);

  // 3. Attempt to update the second configuration to duplicate first's (key, channel_id, section_id)
  await TestValidator.error(
    "Updating to duplicate key/channel_id/section_id throws",
  )(async () => {
    await api.functional.aimall_backend.administrator.configurations.update(
      connection,
      {
        configurationId: config2.id,
        body: {
          key,
          channel_id,
          section_id,
          value: "B updated",
        } satisfies IAimallBackendConfiguration.IUpdate,
      },
    );
  });
}
