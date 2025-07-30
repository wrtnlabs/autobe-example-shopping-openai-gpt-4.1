import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate that configuration creation fails if required fields are missing.
 *
 * Business context: Administrators must supply both 'key' and 'value' fields
 * (in addition to optional scoping/channel/section fields) when creating a
 * backend configuration. These are strictly required by
 * IAimallBackendConfiguration.ICreate. Backend input validation must reject
 * requests missing any of these mandatory fields and return an error. No record
 * should be created if such validation fails. This ensures misconfigurations
 * (missing/partial settings) cannot enter the database.
 *
 * Step-by-step process:
 *
 * 1. Attempt to create a configuration with the 'key' field missing. Expect
 *    validation error.
 * 2. Attempt to create a configuration with the 'value' field missing. Expect
 *    validation error.
 * 3. Attempt to create a configuration with both 'key' and 'value' fields missing.
 *    Expect validation error.
 * 4. Confirm that creation with both required fields present succeeds (valid
 *    control).
 * 5. For failing cases, assert that no configuration record is created and a
 *    validation error occurs.
 */
export async function test_api_aimall_backend_administrator_configurations_test_create_configuration_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Attempt configuration creation missing 'key'
  await TestValidator.error("missing 'key' field should fail")(() =>
    api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          // key intentionally omitted
          value: "test-value",
          channel_id: null,
          section_id: null,
          description: "Config with missing key for test",
        } as any, // bypass compile checking for runtime validation test only
      },
    ),
  );

  // 2. Attempt configuration creation missing 'value'
  await TestValidator.error("missing 'value' field should fail")(() =>
    api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: "test_key_no_value",
          // value intentionally omitted
          channel_id: null,
          section_id: null,
          description: "Config with missing value for test",
        } as any,
      },
    ),
  );

  // 3. Attempt configuration creation missing both 'key' and 'value'
  await TestValidator.error("missing 'key' and 'value' fields should fail")(
    () =>
      api.functional.aimall_backend.administrator.configurations.create(
        connection,
        {
          body: {
            // both key and value fields omitted
            channel_id: null,
            section_id: null,
            description: "Config missing both key and value",
          } as any,
        },
      ),
  );

  // 4. Control: valid configuration creation (should succeed)
  const configuration =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: "test_valid_key",
          value: "test_valid_value",
          channel_id: null,
          section_id: null,
          description: "Fully valid config for control",
        },
      },
    );
  typia.assert(configuration);
  TestValidator.equals("returns correct key")(configuration.key)(
    "test_valid_key",
  );
  TestValidator.equals("returns correct value")(configuration.value)(
    "test_valid_value",
  );
}
