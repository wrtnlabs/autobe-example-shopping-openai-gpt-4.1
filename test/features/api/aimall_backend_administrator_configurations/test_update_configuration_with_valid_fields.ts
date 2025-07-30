import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate successful update of mutable fields on a configuration entity in the
 * aimall_backend_configurations table.
 *
 * Business context: System configurations may need to change over time—such as
 * toggling a feature flag, updating scoped relationships (channel, section), or
 * altering a descriptive comment. This test ensures that only mutable fields
 * can be updated; system constraints (uniqueness, valid foreign keys) are
 * respected; and that the returned entity reflects the change and accurate
 * audit trail.
 *
 * Test Steps:
 *
 * 1. Create a new configuration entity using the POST endpoint.
 *
 *    - Input specifies key, value, optionally channel_id/section_id, description.
 *    - Receive and assert output for type and initial field values; record
 *         configurationId.
 * 2. Update one or more mutable fields (key, value, channel_id, section_id,
 *    description) via the PUT endpoint using configurationId.
 *
 *    - Prepare an update object (e.g., update "value", or "key" or add/change
 *         channel_id or section_id, or modify description).
 *    - Send update and assert output:
 *
 *         - Has original identifying fields (same id, created_at)
 *         - Reflects updated field(s) as expected
 *         - Has updated "updated_at" timestamp
 * 3. Assert non-updated fields remain unchanged and audit timestamps are correct.
 */
export async function test_api_aimall_backend_administrator_configurations_test_update_configuration_with_valid_fields(
  connection: api.IConnection,
) {
  // 1. Create a new configuration for the test
  const createInput: IAimallBackendConfiguration.ICreate = {
    key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
    value: "original_value",
    channel_id: null,
    section_id: null,
    description: "Initial configuration for update test.",
  };
  const created: IAimallBackendConfiguration =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // Preserve original state for later comparison
  const originalId = created.id;
  const originalKey = created.key;
  const originalValue = created.value;
  const originalChannelId = created.channel_id;
  const originalSectionId = created.section_id;
  const originalDescription = created.description;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 2. Prepare the update payload (mutate key, value, description)
  const updateInput: IAimallBackendConfiguration.IUpdate = {
    key: `${originalKey}_updated`,
    value: "updated_value",
    description: "Description updated in test.",
    // Leave channel_id and section_id unchanged
    channel_id: originalChannelId,
    section_id: originalSectionId,
  };
  // 2. Update configuration using PUT
  const updated: IAimallBackendConfiguration =
    await api.functional.aimall_backend.administrator.configurations.update(
      connection,
      {
        configurationId: originalId,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 3. Validation
  // Unchanged identity/audit fields
  TestValidator.equals("id unchanged")(updated.id)(originalId);
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    originalCreatedAt,
  );

  // Audit timestamp
  TestValidator.notEquals("updated_at is updated")(updated.updated_at)(
    originalUpdatedAt,
  );

  // Content fields
  TestValidator.equals("key updated")(updated.key)(updateInput.key);
  TestValidator.equals("value updated")(updated.value)(updateInput.value);
  TestValidator.equals("description updated")(updated.description)(
    updateInput.description,
  );
  // Scope fields (untouched here)
  TestValidator.equals("channel_id unchanged")(updated.channel_id)(
    originalChannelId,
  );
  TestValidator.equals("section_id unchanged")(updated.section_id)(
    originalSectionId,
  );
}
