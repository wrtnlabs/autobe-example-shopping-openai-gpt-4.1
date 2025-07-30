import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate that analytics dashboard update is disallowed for unauthorized
 * (non-admin) users.
 *
 * Business context:
 *
 * - Only administrator users may update analytics dashboards via the
 *   administrator API.
 * - Unauthorized users (users not authenticated as administrators) must receive
 *   an authorization error when attempting to update a dashboard.
 *
 * Test steps:
 *
 * 1. As an administrator, create a new analytics dashboard to ensure there is a
 *    dashboard to attempt updating.
 * 2. Simulate a non-admin (unauthorized) user by stripping authorization from the
 *    connection context.
 * 3. Attempt to update the dashboard as the unauthorized user, expecting the
 *    request to be denied.
 * 4. Confirm that an authorization error is thrown (using TestValidator.error: the
 *    correct failure mechanism per requirements).
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_update_analytics_dashboard_without_authorization(
  connection: api.IConnection,
) {
  // 1. As administrator, create a dashboard for test context
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: null,
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Simulate a non-admin user by removing Authorization from the connection headers
  const unauthorizedConnection = {
    ...connection,
    headers: {
      ...connection.headers,
    },
  };
  if (unauthorizedConnection.headers)
    delete unauthorizedConnection.headers["Authorization"];

  // 3. Attempt to update the dashboard as the unauthorized user; expect an authorization error
  await TestValidator.error("unauthorized update should fail")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.update(
      unauthorizedConnection,
      {
        analyticsDashboardId: dashboard.id,
        body: {
          title: "New title (should not succeed)",
        } satisfies IAimallBackendAnalyticsDashboard.IUpdate,
      },
    );
  });
}
