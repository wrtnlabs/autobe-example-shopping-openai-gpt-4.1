import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate empty dashboard search result with non-existent filter.
 *
 * This test verifies that searching for analytics dashboards using a filter
 * guaranteed to match no results (such as an obviously fake code and a unique
 * nonsense title substring) correctly returns an empty paginated result and
 * valid pagination metadata. This is important for ensuring that admin
 * dashboard search UX and backend reliability are robust to edge cases with no
 * data found—no error state, just a zero-length data array and proper
 * pagination metrics should be returned.
 *
 * Steps:
 *
 * 1. Craft a search filter with code and title that can never match an existing
 *    dashboard.
 * 2. Call the PATCH endpoint /aimall-backend/administrator/analyticsDashboards
 *    using this filter.
 * 3. Assert that the data array is empty ([]), pagination.records is 0, and format
 *    is as expected (no error, correct fields).
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_advanced_search_dashboards_with_no_results(
  connection: api.IConnection,
) {
  // 1. Create a filter for a code and title that do not exist.
  const filter = {
    code: "NO_SUCH_CODE_xyz12345",
    title: "NO MATCHING TITLE XYZ!@#",
  } satisfies IAimallBackendAnalyticsDashboard.IRequest;

  // 2. Call the advanced search API with this impossible filter
  const output =
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      { body: filter },
    );
  typia.assert(output);

  // 3. Validate result: data array is empty, pagination.records is 0, response is well-formed
  TestValidator.equals("dashboard search should have no results")(
    output.data.length,
  )(0);
  TestValidator.equals("pagination 'records' is 0")(output.pagination.records)(
    0,
  );
  TestValidator.predicate("pagination 'pages' is at least 1")(
    typeof output.pagination.pages === "number" && output.pagination.pages >= 1,
  );
  TestValidator.predicate("pagination object is present")(
    typeof output.pagination.current === "number" &&
      typeof output.pagination.limit === "number",
  );
  TestValidator.predicate("no error field in response")(!("error" in output));
}
