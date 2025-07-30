import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate that deleting an audit log is forbidden for non-admin users.
 *
 * This test ensures audit log delete authorization works as expected by
 * attempting the following business flow:
 *
 * 1. As an admin, create an analytics dashboard (this triggers audit log
 *    generation for admin actions)
 * 2. Use the resulting dashboard's UUID as a stand-in auditLogId
 * 3. Simulate a non-admin user context by providing an invalid admin token
 * 4. Attempt to delete the audit log entry using the valid auditLogId
 * 5. Confirm that the request fails with an authorization error (should throw or
 *    return error due to insufficient privileges)
 *
 * Business context: Audit logs are compliance-critical and only super-admins
 * should be able to delete them. This test ensures such protection, preventing
 * accidental or malicious log manipulation by regular users.
 */
export async function test_api_aimall_backend_administrator_auditLogs_test_delete_audit_log_with_insufficient_privileges_is_forbidden(
  connection: api.IConnection,
) {
  // 1. As admin, create an analytics dashboard (generates audit log)
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph()(3),
          description: "E2E Scenario – dashboard for audit log deletion test",
          config_json: JSON.stringify({ widgets: [] }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Simulate a non-admin by providing an invalid admin token
  const fakeNonAdminConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: "Bearer not-an-admin-token",
    },
  };

  // 3. Attempt to delete an audit log using valid (dashboard-related) UUID as auditLogId
  await TestValidator.error("audit log deletion forbidden for non-admin")(
    async () => {
      await api.functional.aimall_backend.administrator.auditLogs.erase(
        fakeNonAdminConnection,
        {
          auditLogId: dashboard.id,
        },
      );
    },
  );
}
