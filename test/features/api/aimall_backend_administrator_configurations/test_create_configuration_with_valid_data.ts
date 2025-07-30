import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate successful creation of a backend configuration entry with all
 * required fields and valid data.
 *
 * This test verifies that a new configuration can be created successfully
 * through the administrator API. The configuration entry can be global (no
 * channel/section), channel-scoped, or channel+section-scoped, but referenced
 * channel and section IDs must exist if provided.
 *
 * Steps:
 *
 * 1. Generate a valid key and value for the configuration.
 * 2. Optionally generate random channel_id and section_id (as UUID) or set null
 *    (simulate all scoping cases).
 * 3. Call the create API with ICreate DTO, using a new (key, channel_id,
 *    section_id) combination to avoid uniqueness conflicts.
 * 4. Expect the response to contain the full configuration entity (including id,
 *    audit fields, etc.), and validate all returned fields.
 * 5. Check that the response values match sent input, and audit fields
 *    (created_at, updated_at) are correct ISO8601 strings.
 */
export async function test_api_aimall_backend_administrator_configurations_test_create_configuration_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Generate a unique key and value for the new configuration.
  const key = `feature_flag_${typia.random<string>()}`;
  const value = `enabled_${typia.random<string>()}`;

  // 2. Use null for channel_id/section_id for global config creation.
  const input: IAimallBackendConfiguration.ICreate = {
    key,
    value,
    channel_id: null,
    section_id: null,
    description: "Test configuration for E2E scenario.",
  };

  // 3. Call the API
  const output: IAimallBackendConfiguration =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: input },
    );
  typia.assert(output);

  // 4. Validate response matches expected structure and input values
  TestValidator.equals("key matches")(output.key)(key);
  TestValidator.equals("value matches")(output.value)(value);
  TestValidator.equals("channel_id matches")(output.channel_id)(
    input.channel_id,
  );
  TestValidator.equals("section_id matches")(output.section_id)(
    input.section_id,
  );
  TestValidator.equals("description matches")(output.description)(
    input.description,
  );

  // 5. Validate audit fields (id, created_at, updated_at)
  TestValidator.predicate("id is uuid")(
    typeof output.id === "string" && /^[0-9a-fA-F-]{36}$/.test(output.id),
  );
  TestValidator.predicate("created_at is ISO 8601")(
    typeof output.created_at === "string" &&
      !Number.isNaN(Date.parse(output.created_at)),
  );
  TestValidator.predicate("updated_at is ISO 8601")(
    typeof output.updated_at === "string" &&
      !Number.isNaN(Date.parse(output.updated_at)),
  );
}
