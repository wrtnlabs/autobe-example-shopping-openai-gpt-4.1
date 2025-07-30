import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";

/**
 * Validate that an administrator is able to list all system configurations.
 *
 * This test ensures:
 *
 * - The endpoint `/aimall-backend/administrator/configurations` responds with all
 *   configuration entities, including global, channel-scoped, and
 *   section-scoped configurations.
 * - Returned objects conform to the IAimallBackendConfiguration.ISummary schema.
 * - No sensitive or extraneous fields are leaked in the response.
 * - At least one configuration exists and is present in the result, by first
 *   creating one.
 *
 * Test Workflow:
 *
 * 1. Create at least one configuration using the admin `create` endpoint to
 *    guarantee a non-empty list.
 * 2. Retrieve the list of all configurations using the admin `index` endpoint.
 * 3. Confirm the result is an array of objects conforming to the ISummary schema.
 * 4. Verify audit and key fields (id, key, value, channel/section context) are
 *    present, and that sensitive or extra fields are not returned.
 * 5. Check the created configuration can be found in the result.
 */
export async function test_api_aimall_backend_administrator_configurations_index(
  connection: api.IConnection,
) {
  // 1. Create a configuration for predictable listing.
  const newConfig =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          // chose a global configuration for predictable matching
          channel_id: null,
          section_id: null,
          key: `e2e_test_key_${typia.random<string>()}`,
          value: "test_value",
          description: "E2E test configuration entry to ensure listing works.",
        } satisfies IAimallBackendConfiguration.ICreate,
      },
    );
  typia.assert(newConfig);

  // 2. Retrieve the full list of configurations as admin.
  const configs =
    await api.functional.aimall_backend.administrator.configurations.index(
      connection,
    );
  typia.assert(configs);

  // 3. Confirm result includes an array of ISummary objects
  if (!Array.isArray(configs))
    throw new Error(
      "Configurations listing did not return an array as expected.",
    );
  for (const item of configs) {
    typia.assert<IAimallBackendConfiguration.ISummary>(item);
  }

  // 4. Check that the configuration just created is present in the results (by key & value)
  const match = configs.find(
    (x) => x.key === newConfig.key && x.value === newConfig.value,
  );
  TestValidator.predicate("created config is present in the list")(!!match);

  // 5. Check for schema compliance and no extra fields in each result
  for (const item of configs) {
    const keys = Object.keys(item);
    const summaryFields = ["id", "channel_id", "section_id", "key", "value"];
    TestValidator.equals("no extra fields in summary")(keys.sort().join(","))(
      summaryFields.sort().join(","),
    );
  }
}
