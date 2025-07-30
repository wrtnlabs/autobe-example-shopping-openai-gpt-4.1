import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling when attempting to delete an audit log that does not
 * exist.
 *
 * This test simulates an administrator attempting to delete an audit log by a
 * UUID that is not present in the system. It confirms that the API returns a
 * proper error (such as 404 not found) and does not alter any records.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is very unlikely to exist in the database.
 * 2. Attempt to delete an audit log using the API endpoint with this non-existent
 *    UUID.
 * 3. Verify that an error is thrown and that the operation does not report
 *    success.
 */
export async function test_api_aimall_backend_administrator_auditLogs_test_delete_audit_log_with_nonexistent_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent audit log
  const fakeAuditLogId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete the non-existent audit log and expect an error
  await TestValidator.error("delete non-existent audit log should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.auditLogs.erase(
        connection,
        { auditLogId: fakeAuditLogId },
      );
    },
  );
}
