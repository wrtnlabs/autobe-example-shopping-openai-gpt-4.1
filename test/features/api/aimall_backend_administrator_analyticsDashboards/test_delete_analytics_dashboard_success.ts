import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validates successful deletion of an analytics dashboard by an administrator.
 *
 * The test creates a new analytics dashboard record – exercising the unique
 * code, title, and optional description/config fields – to ensure a valid
 * target entity exists for deletion. Then, the test deletes this dashboard via
 * the admin API using its unique UUID. After deletion, verify the dashboard
 * cannot be retrieved, and attempt to delete it again to confirm the system
 * rejects deletion of nonexistent resources.
 *
 * (No dedicated GET endpoint is present in the provided API set for validation,
 * so post-deletion negative checks will be limited to ensuring the delete
 * operation for an already-deleted resource fails gracefully.)
 *
 * Steps:
 *
 * 1. Create a dashboard (capture its UUID)
 * 2. Successfully delete the dashboard using its UUID
 * 3. Attempt to delete the same dashboard UUID again (expect error)
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_delete_analytics_dashboard_success(
  connection: api.IConnection,
) {
  // 1. Create a dashboard to obtain a valid UUID
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph()(2),
          description: RandomGenerator.content()()(1),
          config_json: JSON.stringify({ widgets: [], layout: {} }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Successfully delete the dashboard
  await api.functional.aimall_backend.administrator.analyticsDashboards.erase(
    connection,
    {
      analyticsDashboardId: dashboard.id,
    },
  );

  // 3. Attempt to delete the same dashboard again – should error
  await TestValidator.error("dashboard already deleted")(() =>
    api.functional.aimall_backend.administrator.analyticsDashboards.erase(
      connection,
      {
        analyticsDashboardId: dashboard.id,
      },
    ),
  );
}
