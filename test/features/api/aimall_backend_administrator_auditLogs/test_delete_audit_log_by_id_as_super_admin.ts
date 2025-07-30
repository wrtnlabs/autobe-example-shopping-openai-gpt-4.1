import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAnalyticsDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAnalyticsDashboard";

/**
 * Validate the deletion of a specific audit log entry by super administrator.
 *
 * This test ensures that audit logs can be permanently deleted by a user with
 * appropriate permissions. The process begins by creating a new analytics
 * dashboard, which triggers the creation of an audit log entry. While there is
 * no dedicated API to fetch audit log entries directly, for the purpose of this
 * test, the new dashboard's id is used as a stand-in for an audit log id (under
 * the assumption that dashboard creation triggers a corresponding audit log
 * with a matching id in this backend). The test proceeds to delete the audit
 * log, validates the operation by ensuring no errors occur, and checks that a
 * repeated deletion attempt results in an error (verifying permanent removal).
 * Error handling is verified with TestValidator.error.
 *
 * Step-by-step process:
 *
 * 1. Create a new analytics dashboard (to ensure a fresh and removable audit log
 *    entry exists)
 * 2. Use the dashboard id as the audit log id to be deleted
 * 3. Delete the audit log entry and assert the operation succeeds (throws no
 *    error, returns void)
 * 4. Attempt to delete the same audit log entry again, asserting that an error is
 *    thrown
 */
export async function test_api_aimall_backend_administrator_auditLogs_eraseByAuditlogid(
  connection: api.IConnection,
) {
  // 1. Create a new analytics dashboard
  const dashboard =
    await api.functional.aimall_backend.administrator.analyticsDashboards.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph()(3),
          description: RandomGenerator.paragraph()(1),
          config_json: JSON.stringify({ widgets: [], layout: "grid" }),
        } satisfies IAimallBackendAnalyticsDashboard.ICreate,
      },
    );
  typia.assert(dashboard);

  // 2. Use dashboard.id as auditLogId for deletion (since we lack direct audit log access)
  const auditLogId = dashboard.id;

  // 3. Delete the audit log entry
  await api.functional.aimall_backend.administrator.auditLogs.erase(
    connection,
    {
      auditLogId,
    },
  );

  // 4. Attempt to delete the same audit log id again and expect error
  await TestValidator.error("deleting a nonexistent audit log should fail")(
    () =>
      api.functional.aimall_backend.administrator.auditLogs.erase(connection, {
        auditLogId,
      }),
  );
}
