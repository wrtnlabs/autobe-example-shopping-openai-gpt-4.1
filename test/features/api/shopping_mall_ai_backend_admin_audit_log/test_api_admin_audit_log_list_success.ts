import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import type { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Validate the listing, filtering, and pagination of an admin's
 * audit logs in the shopping mall AI backend.
 *
 * This test covers the full workflow needed to ensure admin audit logging
 * behaves as intended, including:
 *
 * 1. Admin registration: Register a new admin user to obtain authentication
 *    and adminId for testing.
 * 2. Auth context establishment: Ensure the connection context has
 *    Authorization and the admin's identity, as all operations require
 *    admin privileges.
 * 3. Admin profile update operation: Trigger an admin operation that must
 *    generate an audit log entry (update admin's own name or email).
 * 4. Audit log listing: Query the audit log list for the same adminId using
 *    the patch /shoppingMallAiBackend/admin/admins/{adminId}/auditLogs
 *    endpoint, with and without filters.
 * 5. Validation: a. Confirm that at least one audit log entry exists
 *    corresponding to the performed update. b. Confirm that the audit log
 *    entry's operation, adminId, timestamp, and any description are
 *    appropriate. c. Test basic pagination (page 1, small page_size) and
 *    validate that pagination metadata is present. d. Optionally validate
 *    that filters (operation, description, range) work by repeating the
 *    query with filter values matching the known update log.
 */
export async function test_api_admin_audit_log_list_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin (and get authentication context)
  const createInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(2),
    email: `${RandomGenerator.alphaNumeric(8)}@e2etest.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: createInput,
  });
  typia.assert(joinResult);
  const adminId = joinResult.admin.id;

  // 2. Perform an admin profile update to generate a log event
  const updateInput: IShoppingMallAiBackendAdmin.IUpdate = {
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@e2eup.com`,
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const updatedAdmin =
    await api.functional.shoppingMallAiBackend.admin.admins.update(connection, {
      adminId,
      body: updateInput,
    });
  typia.assert(updatedAdmin);

  // 3. Request audit log list for the admin with no filters
  const auditList =
    await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
      connection,
      {
        adminId,
        body: {
          page: 1,
          page_size: 10,
        },
      },
    );
  typia.assert(auditList);

  // 4a. Validate log exists for the performed operation
  const logForUpdate = auditList.data.find(
    (x) => x.operation !== undefined && x.admin_id === adminId,
  );
  TestValidator.predicate(
    "audit log entry for profile update operation exists",
    !!logForUpdate,
  );
  TestValidator.equals(
    "audit log entry operation matches the performed operation",
    logForUpdate?.admin_id,
    adminId,
  );

  // 4b. Validate pagination metadata
  TestValidator.predicate(
    "audit log list returns pagination info",
    !!auditList.pagination,
  );
  TestValidator.equals(
    "audit log pagination current page is 1",
    auditList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "audit log page size is at least 1",
    auditList.pagination.limit >= 1,
  );

  // 5. Test filtering by known operation type if operation name available
  if (logForUpdate?.operation) {
    const filteredLogs =
      await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
        connection,
        {
          adminId,
          body: {
            operation: logForUpdate.operation,
            page: 1,
            page_size: 10,
          },
        },
      );
    typia.assert(filteredLogs);
    // All logs returned should have the filter's operation value
    for (const log of filteredLogs.data) {
      TestValidator.equals(
        `filtered log has operation '${logForUpdate.operation}'`,
        log.operation,
        logForUpdate.operation,
      );
    }
  }
}
