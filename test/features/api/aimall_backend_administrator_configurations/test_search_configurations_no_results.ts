import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendConfiguration";
import type { IPageIAimallBackendConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendConfiguration";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test the case where searching for aimall backend administrator configurations
 * yields no results.
 *
 * This test ensures that, when search criteria are set to impossible values
 * (such as a configuration key that could not possibly exist), the API responds
 * correctly by returning an empty data array, while still providing valid
 * pagination metadata.
 *
 * Steps:
 *
 * 1. Construct a search request to the configurations endpoint with a key known to
 *    be impossible (e.g., a random UUID prefix key).
 * 2. Call the search API endpoint as an administrator.
 * 3. Verify the response:
 *
 *    - The `data` array in the response should be empty.
 *    - The `pagination` object must still be present and valid, with `records`,
 *         `pages`, and `current` values indicating zero records.
 */
export async function test_api_aimall_backend_administrator_configurations_test_search_configurations_no_results(
  connection: api.IConnection,
) {
  // 1. Prepare impossible search criteria: impossible key string, all others default (null/omitted)
  const impossibleKey = `NO_SUCH_KEY_${typia.random<string & tags.Format<"uuid">>()}`;
  const input = {
    key: impossibleKey,
    page: null,
    limit: null,
    channel_id: null,
    section_id: null,
    value_contains: null,
    sort_by: null,
    sort_order: null,
  } satisfies IAimallBackendConfiguration.IRequest;

  // 2. Perform search
  const output =
    await api.functional.aimall_backend.administrator.configurations.search(
      connection,
      { body: input },
    );
  typia.assert(output);

  // 3. Validate response: data must be empty, pagination present and has zero records
  TestValidator.equals("empty data array")(output.data.length)(0);
  TestValidator.predicate("pagination present")(
    typeof output.pagination === "object" && output.pagination !== null,
  );
  TestValidator.equals("zero records")(output.pagination.records)(0);
  TestValidator.equals("zero pages")(output.pagination.pages)(0);
}
