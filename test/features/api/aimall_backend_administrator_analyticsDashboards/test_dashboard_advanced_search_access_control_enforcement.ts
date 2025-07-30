import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";
import type { IPageIAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAnalyticsDashboard";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test access control enforcement for advanced analytics dashboard search by
 * non-admin users.
 *
 * This E2E test verifies that users without administrator privileges cannot
 * access the advanced dashboard search endpoint. It is designed to validate
 * that RBAC (role-based access control) is enforced — that is, attempting a
 * PATCH request to /aimall-backend/administrator/analyticsDashboards as a
 * non-admin user will be denied.
 *
 * Steps:
 *
 * 1. Use a non-admin (insufficient-privilege) connection context.
 * 2. Construct a valid, but arbitrary, search request body.
 * 3. Attempt to call the admin dashboard search endpoint.
 * 4. Ensure an HTTP error is thrown, indicating access is forbidden or
 *    unauthorized.
 *
 * No dashboard data or admin setup is necessary—the test strictly focuses on
 * access denial mechanics.
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_dashboard_advanced_search_access_control_enforcement(
  connection: api.IConnection,
) {
  // 1. Use a connection context that is NOT authenticated as admin.
  // (This is assumed provided externally: e.g., no auth token or wrong role.)

  // 2. Construct a valid search request; contents are irrelevant for RBAC denial.
  const req: IAimallBackendAnalyticsDashboard.IRequest = {
    code: null,
    title: null,
    description: null,
  };

  // 3. Attempt the admin search and 4. confirm RBAC enforcement (access denied).
  await TestValidator.error("access is denied to non-admins")(async () => {
    await api.functional.aimall_backend.administrator.analyticsDashboards.search(
      connection,
      { body: req },
    );
  });
}
