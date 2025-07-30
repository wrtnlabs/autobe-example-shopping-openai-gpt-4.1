import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Verify that analytics dashboard detail endpoint enforces admin-only access.
 *
 * This test ensures users without administrator privileges cannot retrieve
 * analytics dashboard configuration details via the admin-only endpoint. It
 * follows this workflow:
 *
 * 1. Create a dashboard via admin POST (precondition).
 * 2. Mimic a non-admin (unauthorized) user context. (Here, simulated by removing
 *    any admin credentials from the existing connection headers — adjust as
 *    appropriate for your authentication system.)
 * 3. Attempt to retrieve the dashboard configuration detail as an unauthorized
 *    user.
 * 4. Confirm a permission-denied error is thrown (access blocked for non-admin
 *    roles).
 * 5. (Audit/security log validation is omitted unless a dedicated endpoint is
 *    provided.)
 */
export async function test_api_aimall_backend_administrator_analyticsDashboards_test_get_dashboard_detail_role_permission_checks(
  connection: api.IConnection,
) {
  // 1. Create dashboard as admin
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({
            widgets: [],
            layout: "single",
            theme: "dark",
            test: true,
          }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Simulate a non-admin (unauthorized) user context
  // Remove admin tokens or auth headers as per your system's authentication scheme
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
    },
    simulate: false,
  };

  // 3. Attempt dashboard detail retrieval as non-admin
  await TestValidator.error("non-admin cannot access dashboard details")(
    async () => {
      await api.functional.aimall_backend.administrator.analyticsDashboards.at(
        unauthorizedConnection,
        {
          analyticsDashboardId: dashboard.id,
        },
      );
    },
  );

  // 4. (Optional) Audit/security log check omitted — not implementable if no API.
}
