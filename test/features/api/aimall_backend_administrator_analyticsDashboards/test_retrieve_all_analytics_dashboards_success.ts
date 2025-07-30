import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate the successful retrieval of a paginated analytics dashboards list
 * for an admin user.
 *
 * This test ensures the admin can retrieve all dashboard configuration records,
 * along with proper pagination info.
 *
 * Steps:
 *
 * 1. Ensure at least two analytics dashboard records exist by creating two with
 *    unique codes.
 * 2. Call the analytics dashboards GET endpoint as administrator.
 * 3. Verify the paginated result contains all created dashboards and proper
 *    pagination metadata.
 * 4. Assert the structure and content of each dashboard entity matches what was
 *    created.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_index(
  connection: api.IConnection,
) {
  // 1. Create two analytics dashboards to ensure listing returns data
  const dashboardA =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(16),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({
            layout: "basic",
            widgets: 1 + Math.floor(Math.random() * 5),
          }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboardA);

  const dashboardB =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(16),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({
            layout: "advanced",
            widgets: 2 + Math.floor(Math.random() * 4),
          }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboardB);

  // 2. Get all dashboards as admin
  const result =
    await api.functional.aimall_backend.administrator.analyticsDashboards.index(
      connection,
    );
  typia.assert(result);

  // 3. Validate pagination metadata and presence of created dashboards
  TestValidator.predicate("should have at least 2 dashboard records")(
    result.pagination.records >= 2,
  );
  TestValidator.predicate("dashboard A present")(
    result.data.some((d) => d.id === dashboardA.id),
  );
  TestValidator.predicate("dashboard B present")(
    result.data.some((d) => d.id === dashboardB.id),
  );

  // 4. Validate structure and content of created dashboards in the result list
  for (const dashboard of [dashboardA, dashboardB]) {
    const found = result.data.find((d) => d.id === dashboard.id);
    TestValidator.predicate(
      `dashboard with id ${dashboard.id} must exist in result`,
    )(!!found);
    if (found) {
      TestValidator.equals(`code for dashboard ${dashboard.id}`)(found.code)(
        dashboard.code,
      );
      TestValidator.equals(`title for dashboard ${dashboard.id}`)(found.title)(
        dashboard.title,
      );
      TestValidator.equals(`description for dashboard ${dashboard.id}`)(
        found.description,
      )(dashboard.description);
      TestValidator.equals(`config_json for dashboard ${dashboard.id}`)(
        found.config_json,
      )(dashboard.config_json);
    }
  }
}
