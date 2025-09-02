import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import type { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_audit_log_list_unauthorized_access(
  connection: api.IConnection,
) {
  /**
   * E2E test to verify that an admin user cannot access the audit logs of
   * another admin, ensuring strict privilege boundaries in the backend
   * administration platform.
   *
   * This test creates two unique admin accounts. Using authentication context
   * of the first admin, it attempts to retrieve audit logs for the second admin
   * via the PATCH /shoppingMallAiBackend/admin/admins/{adminId}/auditLogs API
   * endpoint. It expects an error to be thrown (authorization denied),
   * confirming that audit log data is accessible only to the owner and that
   * unauthorized access yields no data.
   *
   * Steps:
   *
   * 1. Register a first admin and authenticate
   * 2. Register a second admin (with different credentials)
   * 3. Switch context to first admin if needed
   * 4. Attempt to access second admin's audit logs as first admin and assert error
   *    is thrown
   */

  // 1. Register the first admin
  const admin1_profile = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const admin1_auth = await api.functional.auth.admin.join(connection, {
    body: admin1_profile,
  });
  typia.assert(admin1_auth);
  const admin1_id = admin1_auth.admin.id;

  // Authenticate as admin1 (using the same 'password_hash' value for test/demo purposes)
  await api.functional.auth.admin.login(connection, {
    body: {
      username: admin1_profile.username,
      password: admin1_profile.password_hash,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 2. Register the second admin with unique credentials
  const admin2_profile = {
    username: RandomGenerator.alphaNumeric(10),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    is_active: true,
    phone_number: RandomGenerator.mobile(),
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const admin2_auth = await api.functional.auth.admin.join(connection, {
    body: admin2_profile,
  });
  typia.assert(admin2_auth);
  const admin2_id = admin2_auth.admin.id;

  // 3. (Re-)login as admin1 to ensure correct context
  await api.functional.auth.admin.login(connection, {
    body: {
      username: admin1_profile.username,
      password: admin1_profile.password_hash,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 4. Try to retrieve audit logs for admin2 as admin1 -- should error
  await TestValidator.error(
    "unauthorized admin cannot access another admin's audit logs",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
        connection,
        {
          adminId: admin2_id,
          body: {} satisfies IShoppingMallAiBackendAdminAuditLog.IRequest,
        },
      );
    },
  );
}
