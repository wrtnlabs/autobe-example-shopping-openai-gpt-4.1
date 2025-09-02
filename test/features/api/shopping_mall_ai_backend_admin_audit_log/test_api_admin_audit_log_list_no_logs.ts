import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import type { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_audit_log_list_no_logs(
  connection: api.IConnection,
) {
  /**
   * Validate retrieving a zero-entry audit log list for a newly registered
   * admin.
   *
   * This test ensures that when a new admin is created, their associated audit
   * log list is empty (no prior activity). It follows this sequence:
   *
   * 1. Register a new admin (using POST /auth/admin/join), establishing adminId
   *    and authentication context.
   * 2. Retrieve the audit log list for that admin using PATCH
   *    /shoppingMallAiBackend/admin/admins/{adminId}/auditLogs.
   * 3. Validate that the returned result is a valid empty paginated list.
   */
  // 1. Register a new admin
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: null,
  };
  const adminAuthorized: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(adminAuthorized);
  const adminId: string = typia.assert(adminAuthorized.admin.id);

  // 2. Retrieve audit log list for the newly created admin (should have no activity)
  const auditLogsPage: IPageIShoppingMallAiBackendAdminAuditLog.ISummary =
    await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
      connection,
      {
        adminId,
        body: {
          admin_id: adminId,
          page: 1,
          page_size: 20,
        } satisfies IShoppingMallAiBackendAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPage);
  TestValidator.equals(
    "audit log result set should be empty",
    auditLogsPage.data,
    [],
  );
  TestValidator.predicate(
    "pagination current page should be 1",
    auditLogsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 20",
    auditLogsPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records count should be 0",
    auditLogsPage.pagination.records === 0,
  );
  TestValidator.predicate(
    "pagination pages count should be 0",
    auditLogsPage.pagination.pages === 0,
  );
}
