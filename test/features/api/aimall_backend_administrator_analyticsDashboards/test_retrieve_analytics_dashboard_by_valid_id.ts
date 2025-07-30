import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate retrieving an analytics dashboard by ID as an administrator.
 *
 * This E2E test verifies that an administrator can create an analytics
 * dashboard, then fetch its configuration by ID and receive an exact match to
 * the entity just created, including all business fields and audit timestamps.
 *
 * Steps:
 *
 * 1. Create an analytics dashboard with a unique code, title, description, and
 *    config_json payload.
 * 2. Retrieve the dashboard detail using its returned id.
 * 3. Assert all non-audit fields match exactly (code, title, description,
 *    config_json).
 * 4. Ensure created_at and updated_at audit timestamps are present and ISO8601
 *    parseable.
 *
 * Only admin access is used and required for all API calls.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_retrieve_analytics_dashboard_by_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new analytics dashboard as admin
  const dashboardInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code: RandomGenerator.alphaNumeric(8),
    title: "E2E Dashboard Test Title",
    description: RandomGenerator.paragraph()(),
    config_json: JSON.stringify({
      widgets: [{ type: "bar", data: [1, 2, 3] }],
    }),
  };
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      { body: dashboardInput },
    );
  typia.assert(dashboard);

  // 2. Retrieve the dashboard by ID
  const fetched =
    await api.functional.aimall_backend.administrator.analyticsDashboards.at(
      connection,
      { analyticsDashboardId: dashboard.id },
    );
  typia.assert(fetched);

  // 3. Validate all fields match what was created, including config and description
  TestValidator.equals("id matches")(fetched.id)(dashboard.id);
  TestValidator.equals("code matches")(fetched.code)(dashboardInput.code);
  TestValidator.equals("title matches")(fetched.title)(dashboardInput.title);
  TestValidator.equals("description matches")(fetched.description)(
    dashboardInput.description,
  );
  TestValidator.equals("config_json matches")(fetched.config_json)(
    dashboardInput.config_json,
  );

  // 4. Audit timestamps must be present and valid ISO8601 date-time strings
  TestValidator.predicate("created_at is present and ISO8601")(
    typeof fetched.created_at === "string" &&
      !isNaN(Date.parse(fetched.created_at)),
  );
  TestValidator.predicate("updated_at is present and ISO8601")(
    typeof fetched.updated_at === "string" &&
      !isNaN(Date.parse(fetched.updated_at)),
  );
}
