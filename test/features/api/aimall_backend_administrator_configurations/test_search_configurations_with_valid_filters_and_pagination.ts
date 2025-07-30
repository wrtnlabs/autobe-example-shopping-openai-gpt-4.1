import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";
import type { IPageIAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate searching system configurations with filters and pagination.
 *
 * This test verifies the administrator's ability to search system configuration
 * records using a variety of filter options and pagination/sorting, ensuring
 * that only records matching the criteria are returned and pagination metadata
 * is consistent with expected results.
 *
 * Steps:
 *
 * 1. Create three configuration records, each scoped differently:
 *
 *    - A global configuration (channel_id and section_id null)
 *    - A channel-scoped configuration (channel_id set, section_id null)
 *    - A section-scoped configuration (same channel_id as above, section_id set) All
 *         records use unique keys/values for robust filter testing.
 * 2. Run multiple searches via the PATCH endpoint:
 *
 *    - By exact key
 *    - By partial key
 *    - By value substring
 *    - By channel_id and section_id
 *    - By pagination (limit, page)
 *    - By sorting fields (e.g., sort_by and sort_order)
 * 3. Validate:
 *
 *    - Only matching data is returned for each filter
 *    - Pagination metadata accurately reflects query and results
 *    - Edge case: No-match search returns empty array and paginated metadata
 */
export async function test_api_aimall_backend_administrator_configurations_test_search_configurations_with_valid_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create distinct test records for all filter types
  const globalKey = `global_feature_${RandomGenerator.alphaNumeric(6)}`;
  const globalConfig =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: globalKey,
          value: "active",
          channel_id: null,
          section_id: null,
          description: "E2E test - global config",
        },
      },
    );
  typia.assert(globalConfig);

  const channelId = typia.random<string & tags.Format<"uuid">>();
  const channelKey = `channel_flag_${RandomGenerator.alphaNumeric(6)}`;
  const channelConfig =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: channelKey,
          value: "enabled",
          channel_id: channelId,
          section_id: null,
          description: "E2E test - channel config",
        },
      },
    );
  typia.assert(channelConfig);

  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const sectionKey = `section_setting_${RandomGenerator.alphaNumeric(6)}`;
  const sectionConfig =
    await api.functional.aimall_backend.administrator.configurations.create(
      connection,
      {
        body: {
          key: sectionKey,
          value: "special",
          channel_id: channelId,
          section_id: sectionId,
          description: "E2E test - section config",
        },
      },
    );
  typia.assert(sectionConfig);

  // 2. Search by exact key (globalKey)
  let result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { key: globalKey },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all returned records have the searched key")(
    result.data.every((cfg) => cfg.key === globalKey),
  );
  TestValidator.equals("pagination reflects single record found")(
    result.pagination.records,
  )(1);

  // 3. Partial key search - should find at least the global record
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { key: "global_feature" },
      },
    );
  typia.assert(result);
  TestValidator.predicate("partial key search includes global config")(
    result.data.some((cfg) => cfg.id === globalConfig.id),
  );

  // 4. Value substring search for "enabled" value (channel scoped record)
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { value_contains: "enabled" },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all records have 'enabled' substring in value")(
    result.data.every((cfg) => cfg.value.includes("enabled")),
  );

  // 5. Filter by channel_id
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { channel_id: channelId },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all records match the channel_id filter")(
    result.data.every((cfg) => cfg.channel_id === channelId),
  );

  // 6. Filter by section_id
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { section_id: sectionId },
      },
    );
  typia.assert(result);
  TestValidator.predicate("all records match section_id filter")(
    result.data.every((cfg) => cfg.section_id === sectionId),
  );

  // 7. Pagination: limit=1, page=2 (test multiple pages)
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { limit: 1, page: 2 },
      },
    );
  typia.assert(result);
  TestValidator.equals("pagination limit is respected")(
    result.pagination.limit,
  )(1);
  TestValidator.equals("pagination current page is 2")(
    result.pagination.current,
  )(2);

  // 8. Sort by key descending
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { sort_by: "key", sort_order: "desc" },
      },
    );
  typia.assert(result);
  const descSorted = [...result.data].sort((a, b) =>
    b.key.localeCompare(a.key),
  );
  TestValidator.equals("sort descending by key")(result.data)(descSorted);

  // 9. Edge - filter with no matches
  result =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      {
        body: { key: "_no_config_with_this_key_" },
      },
    );
  typia.assert(result);
  TestValidator.equals("empty result when key does not exist")(
    result.data.length,
  )(0);
  TestValidator.predicate("pagination object still returned")(
    typeof result.pagination === "object" && result.pagination.current >= 1,
  );
}
