import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error response when deleting a non-existent analytics dashboard
 *
 * This test ensures that attempting to delete an analytics dashboard
 * configuration using a non-existent or invalid `analyticsDashboardId` results
 * in a not found error, without any side effects. Only administrators have
 * permission for this operation, but the scenario focuses specifically on the
 * error response for missing target resources.
 *
 * Steps:
 *
 * 1. Generate a random, valid-format (UUID) analyticsDashboardId that does not
 *    correspond to any existing dashboard.
 * 2. Attempt to delete the analytics dashboard by passing this non-existent ID to
 *    the delete endpoint.
 * 3. Verify that a not found error is returned (typically 404), and that no
 *    unexpected errors or side effects occur.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_delete_nonexistent_analytics_dashboard(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any real dashboard
  const fakeDashboardId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete the non-existent analytics dashboard
  await TestValidator.error(
    "should return 404 Not Found for non-existent analyticsDashboardId",
  )(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.erase(
      connection,
      {
        analyticsDashboardId: fakeDashboardId,
      },
    );
  });
}
