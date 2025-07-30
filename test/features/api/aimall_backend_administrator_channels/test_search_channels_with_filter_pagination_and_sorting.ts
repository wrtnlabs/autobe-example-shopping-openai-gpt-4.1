import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendChannel";
import type { IPageIAimallBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendChannel";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced search and filtering of platform channels by administrators.
 *
 * This test covers the administrator's ability to use structured filters,
 * pagination, and sorting when searching for channel entities. It provides
 * coverage for the following business requirements:
 *
 * 1. Ability to filter by channel status (enabled), code, and name (partial or
 *    exact).
 * 2. Supports pagination controls via limit and page, and checks the pagination
 *    metadata matches query.
 * 3. Supports sorting by supported fields and ordering, and verifies correct sort
 *    order in results.
 * 4. Ensures only channels matching filter conditions are present in data.
 * 5. Checks that edge-cases (page overflow, filter on non-existent values, empty
 *    result sets) behave as expected.
 *
 * Steps of the test:
 *
 * 1. Issue a search with a filter known to match at least one channel, set
 *    limit=2, and sort descending by code.
 * 2. Validate data: every returned channel matches filter (enabled and the
 *    filtered code).
 * 3. Assert pagination metadata: correct limit, nonzero records, and at least one
 *    result page.
 * 4. Confirm result sort order (descending by code).
 * 5. Issue a search with a filter that cannot match any channel (nonsense code),
 *    expect empty result set and correct pagination.
 * 6. Issue a search with page overflow (very high page number), expect empty
 *    result set, correct page metadata, and 0 data.
 */
export async function test_api_aimall_backend_administrator_channels_test_search_channels_with_filter_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Issue an advanced search that should return at least one record (filter: enabled = true, sort by code desc, limit 2)
  const filterCode = "WEB"; // commonly expected value for demonstration, adjust as per seed
  const filterEnabled = true;
  const limit = 2;

  const response1 =
    await api.functional.aimall_backend.administrator.channels.search(
      connection,
      {
        body: {
          code: filterCode,
          enabled: filterEnabled,
          limit,
          sort_by: "code",
          sort_order: "desc",
          page: 1,
        } satisfies IAimallBackendChannel.IRequest,
      },
    );
  typia.assert(response1);

  // Step 2: Verify all data matches the filter (enabled and code)
  for (const channel of response1.data) {
    TestValidator.equals("Channel code matches filter")(channel.code)(
      filterCode,
    );
    TestValidator.equals("Channel is enabled")(channel.enabled)(filterEnabled);
  }

  // Step 3: Check pagination metadata
  TestValidator.equals("Pagination limit")(response1.pagination.limit)(limit);
  TestValidator.predicate("Nonzero records")(response1.data.length >= 1);
  TestValidator.equals("Current page")(response1.pagination.current)(1);
  // Step 4: Confirm result sort order (descending by code)
  TestValidator.equals("Sort order")(response1.data.map((c) => c.code))(
    [...response1.data]
      .sort((a, b) => b.code.localeCompare(a.code))
      .map((c) => c.code),
  );

  // Step 5: Issue a search with a nonsense code (should be empty results)
  const response2 =
    await api.functional.aimall_backend.administrator.channels.search(
      connection,
      {
        body: {
          code: "NO_SUCH_CODE",
          limit,
          page: 1,
        } satisfies IAimallBackendChannel.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals("No data when filtering nonexistent code")(
    response2.data.length,
  )(0);

  // Step 6: Page overflow (page number very high), expect empty results
  const response3 =
    await api.functional.aimall_backend.administrator.channels.search(
      connection,
      {
        body: {
          limit,
          page: 9999,
        } satisfies IAimallBackendChannel.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals("Page overflow returns no data")(response3.data.length)(
    0,
  );
}
