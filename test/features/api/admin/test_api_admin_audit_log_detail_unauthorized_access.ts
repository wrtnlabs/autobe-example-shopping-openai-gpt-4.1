import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdminAuditLog";
import type { IPageIShoppingMallAiBackendAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendAdminAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_audit_log_detail_unauthorized_access(
  connection: api.IConnection,
) {
  /**
   * E2E test verifying that an admin cannot access another admin's audit log
   * entry.
   *
   * Steps:
   *
   * 1. Register and authenticate admin1
   * 2. Admin1 performs an auditable profile update
   * 3. Retrieve admin1's audit log list and get a log ID
   * 4. Register and authenticate admin2
   * 5. Switch context to admin2 (login)
   * 6. Attempt to retrieve admin1's audit log detail as admin2 (should be denied)
   */

  // 1. Register and authenticate admin1
  const admin1_username = RandomGenerator.alphaNumeric(10);
  const admin1_password = RandomGenerator.alphaNumeric(12);
  const admin1_email = `${RandomGenerator.alphabets(8)}@company.com`;
  const admin1_join = await api.functional.auth.admin.join(connection, {
    body: {
      username: admin1_username,
      password_hash: admin1_password,
      name: RandomGenerator.name(),
      email: admin1_email as string & tags.Format<"email">,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin1_join);
  const admin1_id = typia.assert(admin1_join.admin.id);

  // 2. Admin1 performs an auditable profile update
  const update_data: IShoppingMallAiBackendAdmin.IUpdate = {
    name: RandomGenerator.name(),
  };
  const update_res =
    await api.functional.shoppingMallAiBackend.admin.admins.update(connection, {
      adminId: admin1_id,
      body: update_data,
    });
  typia.assert(update_res);

  // 3. Retrieve admin1's audit log list and get an audit log ID
  const auditLogList =
    await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.index(
      connection,
      {
        adminId: admin1_id,
        body: {},
      },
    );
  typia.assert(auditLogList);
  TestValidator.predicate(
    "audit log(s) for admin1 exist (should after admin1 performs action)",
    auditLogList.data.length > 0,
  );
  const auditLogId = typia.assert(auditLogList.data[0].id);

  // 4. Register and authenticate admin2
  const admin2_username = RandomGenerator.alphaNumeric(10);
  const admin2_password = RandomGenerator.alphaNumeric(12);
  const admin2_email = `${RandomGenerator.alphabets(8)}@company.com`;
  const admin2_join = await api.functional.auth.admin.join(connection, {
    body: {
      username: admin2_username,
      password_hash: admin2_password,
      name: RandomGenerator.name(),
      email: admin2_email as string & tags.Format<"email">,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin2_join);

  // 5. Switch context to admin2 (login), changing connection token
  await api.functional.auth.admin.login(connection, {
    body: {
      username: admin2_username,
      password: admin2_password,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 6. Attempt to retrieve admin1's audit log as admin2 (must fail with authorization error)
  await TestValidator.error(
    "admin2 must not access admin1's audit log entry",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.admins.auditLogs.at(
        connection,
        {
          adminId: admin1_id,
          auditLogId,
        },
      );
    },
  );
}
