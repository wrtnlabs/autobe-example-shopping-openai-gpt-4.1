import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate that an administrator can successfully create an analytics dashboard
 * configuration with valid input.
 *
 * This test confirms:
 *
 * 1. Dashboard creation with all required and optional fields.
 * 2. Code uniqueness enforcement (duplicate code creation fails).
 * 3. Returned dashboard entity contains all expected fields, properly populated.
 * 4. Business policy: only administrators can create dashboards (requires
 *    admin-privileged connection).
 *
 * Steps:
 *
 * 1. Create analytics dashboard with unique code, title, description, and
 *    config_json.
 * 2. Assert success and verify returned fields.
 * 3. Attempt to create another dashboard with the same code and expect an error
 *    due to code uniqueness constraint.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_create_analytics_dashboard_with_valid_configuration(
  connection: api.IConnection,
) {
  // Step 1. Prepare unique dashboard creation input
  const dashboardCode = `dashboard-${typia.random<string>().substring(0, 8)}`;
  const createInput: IAimallBackendAnalyticsDashboard.ICreate = {
    code: dashboardCode,
    title: `Dashboard Title - ${typia.random<string>().substring(0, 8)}`,
    description: "Automated E2E dashboard creation test.",
    config_json: JSON.stringify({ widgets: [{ id: 1, type: "chart" }] }),
  };

  // Step 2. Create dashboard
  const created =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      { body: createInput },
    );
  typia.assert(created);

  // Step 3. Validate all returned fields
  TestValidator.equals("code matches")(created.code)(createInput.code);
  TestValidator.equals("title matches")(created.title)(createInput.title);
  TestValidator.equals("description matches")(created.description)(
    createInput.description,
  );
  TestValidator.equals("config_json matches")(created.config_json)(
    createInput.config_json,
  );
  TestValidator.predicate("id is uuid")(!!created.id && created.id.length > 20);
  TestValidator.predicate("created_at is ISO date")(
    !!created.created_at && !isNaN(Date.parse(created.created_at)),
  );
  TestValidator.predicate("updated_at is ISO date")(
    !!created.updated_at && !isNaN(Date.parse(created.updated_at)),
  );

  // Step 4. Attempt to create dashboard with duplicate code (should fail)
  const duplicateInput: IAimallBackendAnalyticsDashboard.ICreate = {
    ...createInput,
    title: "Duplicate Dashboard Title",
  };
  await TestValidator.error("dashboard code must be unique")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      { body: duplicateInput },
    );
  });
}
