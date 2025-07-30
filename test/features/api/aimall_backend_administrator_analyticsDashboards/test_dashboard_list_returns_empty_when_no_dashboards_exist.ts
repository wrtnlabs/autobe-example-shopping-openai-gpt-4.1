import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate correct system response when no analytics dashboards exist.
 *
 * This test ensures that when there are no analytics dashboards configured in
 * the system (fresh or recently cleared environment), the administrator
 * dashboard listing API returns:
 *
 * - An empty array for the dashboard data
 * - Properly structured pagination metadata that matches an empty set
 * - No error responses (should succeed with HTTP 200 and proper structure)
 *
 * Test Steps:
 *
 * 1. In a fresh environment (no dashboards created), call the GET
 *    /aimall-backend/administrator/analyticsDashboards endpoint.
 * 2. Validate that the returned data array is empty.
 * 3. Validate that the pagination metadata reflects zero records (current=1, limit
 *    as default, records=0, pages=0).
 * 4. Validate type safety of the response structure using typia.assert.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_index_returns_empty_when_no_dashboards_exist(
  connection: api.IConnection,
) {
  // 1. Call the dashboard listing endpoint in an empty system
  const result =
    await api.functional.aimall_backend.administrator.analyticsDashboards.index(
      connection,
    );
  typia.assert(result);

  // 2. Expect empty data array
  TestValidator.equals("dashboard data array is empty")(result.data)([]);

  // 3. Pagination metadata must reflect no records
  TestValidator.equals("pagination - current page")(result.pagination.current)(
    1,
  );
  // Most systems default to 'limit' of e.g. 20, but since API contract doesn't fix it, only check zero records & pages
  TestValidator.equals("pagination - zero records")(result.pagination.records)(
    0,
  );
  TestValidator.equals("pagination - zero pages")(result.pagination.pages)(0);
}
