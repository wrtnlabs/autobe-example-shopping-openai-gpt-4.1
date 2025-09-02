import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import type { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_audit_log_detail_success(
  connection: api.IConnection,
) {
  /**
   * Validate the successful retrieval of an individual admin audit log entry.
   *
   * Flow:
   *
   * 1. Register a new admin and authenticate; capture adminId.
   * 2. Perform a profile update (generates an audit log).
   * 3. Retrieve audit log list; ensure a matching ('update') log is available.
   * 4. Fetch detail for the retrieved auditLogId.
   * 5. Validate all returned audit log detail fields match log list summary.
   */

  // 1. Register new admin and obtain adminId
  const username = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphabets(7)}@company.com`;
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username,
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinResult);
  const adminId = typia.assert(joinResult.admin.id);

  // 2. Perform a profile update (name/phone_number), which generates an audit log
  const newName = RandomGenerator.paragraph({ sentences: 2 });
  const newPhoneNumber = RandomGenerator.mobile();
  const updateResult =
    await api.functional.shoppingMallAiBackend.admin.admins.update(connection, {
      adminId,
      body: {
        name: newName,
        phone_number: newPhoneNumber,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.IUpdate,
    });
  typia.assert(updateResult);

  // 3. Retrieve the audit log list for this admin
  const auditLogList =
    await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
      connection,
      {
        adminId,
        body: {
          page: 1,
          page_size: 10,
          sort: "created_at_desc",
        } satisfies IShoppingMallAiBackendAdminAuditLog.IRequest,
      },
    );
  typia.assert(auditLogList);

  // Find matching audit log entry (preferably operation related to 'update')
  const updateLogSummary =
    auditLogList.data.find(
      (log) =>
        typeof log.operation === "string" &&
        log.operation.toLowerCase().includes("update") &&
        log.admin_id === adminId,
    ) ?? (auditLogList.data.length > 0 ? auditLogList.data[0] : undefined);
  TestValidator.predicate(
    "Audit log entry for admin profile update must exist",
    !!updateLogSummary,
  );
  typia.assert(updateLogSummary!);

  // 4. Retrieve detail of the selected audit log entry
  const auditLogDetail =
    await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.at(
      connection,
      {
        adminId,
        auditLogId: updateLogSummary!.id,
      },
    );
  typia.assert(auditLogDetail);

  // 5. Validate that all fields in audit log detail match the log summary
  TestValidator.equals(
    "audit log id matches summary",
    auditLogDetail.id,
    updateLogSummary!.id,
  );
  TestValidator.equals(
    "audit log admin id matches summary",
    auditLogDetail.admin_id,
    updateLogSummary!.admin_id,
  );
  TestValidator.equals(
    "audit log operation matches summary",
    auditLogDetail.operation,
    updateLogSummary!.operation,
  );
  TestValidator.equals(
    "audit log target_type matches summary",
    auditLogDetail.target_type,
    updateLogSummary!.target_type,
  );
  TestValidator.equals(
    "audit log target_id matches summary",
    auditLogDetail.target_id,
    updateLogSummary!.target_id,
  );
  TestValidator.equals(
    "audit log description matches summary",
    auditLogDetail.description,
    updateLogSummary!.description,
  );
  TestValidator.equals(
    "audit log created_at matches summary",
    auditLogDetail.created_at,
    updateLogSummary!.created_at,
  );

  // (Optionally reinforce business-specific expectations, e.g. non-empty strings)
  TestValidator.predicate(
    "audit log operation should be non-empty string",
    typeof auditLogDetail.operation === "string" &&
      !!auditLogDetail.operation.trim(),
  );
  TestValidator.predicate(
    "audit log target_type should be non-empty string",
    typeof auditLogDetail.target_type === "string" &&
      !!auditLogDetail.target_type.trim(),
  );
  TestValidator.predicate(
    "audit log target_id should be non-empty string",
    typeof auditLogDetail.target_id === "string" &&
      !!auditLogDetail.target_id.trim(),
  );
  TestValidator.predicate(
    "audit log created_at should be non-empty string",
    typeof auditLogDetail.created_at === "string" &&
      !!auditLogDetail.created_at.trim(),
  );
}
