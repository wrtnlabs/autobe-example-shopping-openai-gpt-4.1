import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Test that non-administrator credentials cannot access the analytics dashboard
 * admin list.
 *
 * This function verifies that a user without administrator privileges (or with
 * insufficient privileges) is denied access when attempting to retrieve the
 * analytics dashboard configuration list from the protected administrator
 * endpoint. The test ensures the API enforces access control, denying
 * non-administrators with an explicit error.
 *
 * Steps:
 *
 * 1. Attempt to access /aimall-backend/administrator/analyticsDashboards using a
 *    non-admin or anonymous connection.
 * 2. Confirm that the API throws an authentication/authorization error and access
 *    is denied (such as 403 Forbidden).
 * 3. (If the API exposes audit logging for such events and SDK materials are
 *    available, this test would check audit log records. Omitted here due to
 *    unavailable API).
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_dashboard_list_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // Attempt to request the analytics dashboard list as a non-admin user.
  await TestValidator.error("access denied for non-admin users")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.index(
      connection,
    );
  });
  // (Optional) Audit log check would go here if an API was available.
}
