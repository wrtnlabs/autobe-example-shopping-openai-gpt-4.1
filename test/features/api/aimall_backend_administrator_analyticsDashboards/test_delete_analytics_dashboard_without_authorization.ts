import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Test dashboard deletion authorization and access control enforcement.
 *
 * This test verifies that only an administrator can delete an analytics
 * dashboard. The workflow involves (1) creating an analytics dashboard as an
 * admin, (2) attempting to delete it as a non-admin (expecting failure due to
 * access control), and (3) confirming successful deletion as an authorized
 * admin.
 *
 * Steps:
 *
 * 1. Create a dashboard (with administrator privileges)
 * 2. Simulate a non-admin user by removing the Authorization header from the
 *    connection
 * 3. Attempt to delete the dashboard as non-admin and confirm
 *    forbidden/unauthorized error
 * 4. Delete the dashboard as admin and confirm successful deletion (no error)
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_delete_analytics_dashboard_without_authorization(
  connection: api.IConnection,
) {
  // 1. Create an analytics dashboard as an administrator
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({ widgets: [], layout: [] }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Simulate non-administrator by removing Authorization header
  const nonAdminConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete nonAdminConnection.headers.Authorization;

  // 3. Attempt to delete as non-admin and expect forbidden/unauthorized error
  await TestValidator.error("Non-admin cannot delete dashboard")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.erase(
      nonAdminConnection,
      { analyticsDashboardId: dashboard.id },
    );
  });

  // 4. Delete as administrator and expect success (no error thrown)
  await api.functional.aimall_backend.administrator.analyticsDashboards.erase(
    connection,
    { analyticsDashboardId: dashboard.id },
  );
}
