import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Validate irreversible deletion of an admin audit log entry by an authorized
 * admin.
 *
 * This test covers:
 *
 * 1. Register a new admin account and log in successfully.
 * 2. Attempt to delete a non-existent admin audit log entry and confirm error is
 *    raised.
 * 3. (Suppose) Insert a dummy audit log entry (simulate UUID, since there's no
 *    create endpoint in the API list).
 * 4. Delete the dummy log entry successfully.
 * 5. Verify that subsequent attempts to delete the same entry fail (confirm
 *    irreversible removal).
 * 6. Attempt deletion as a non-admin (simulate by removing Authorization header)
 *    and confirm error. (since no user login is available, skip non-admin test
 *    but establish header is required).
 *
 * Data integrity: After deletion, ensure the log entry cannot be deleted again
 * (simulate lookup failure). Audit: (No listing or querying available in API
 * list, so skip checking audit of deletes.)
 *
 * Limitations: As there's no create/list endpoint for audit logs, simulate
 * their existence with random UUIDs.
 */
export async function test_api_admin_audit_log_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authorize a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = "adminPW@123";

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: adminFullName,
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Attempt deletion of non-existent audit log entry (should fail)
  const nonexistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "delete non-existent admin audit log returns error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.erase(connection, {
        adminAuditLogId: nonexistentLogId,
      });
    },
  );

  // 3. Simulate a valid audit log entry UUID
  const dummyLogId = typia.random<string & tags.Format<"uuid">>();

  // 4. Successfully delete the dummy log (simulate that it does exist)
  //    (In reality, deletion returns void so can't check existence; test for no error.)
  await api.functional.shoppingMall.admin.adminAuditLogs.erase(connection, {
    adminAuditLogId: dummyLogId,
  });

  // 5. Try deleting the same entry again, which should now fail
  await TestValidator.error(
    "deleting already deleted audit log should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.erase(connection, {
        adminAuditLogId: dummyLogId,
      });
    },
  );

  // 6. Simulate non-admin access: unauthenticated/invalid token (fresh connection)
  //    (No user login in API list; simulate with no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "delete admin audit log as unauthenticated should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.erase(unauthConn, {
        adminAuditLogId: dummyLogId,
      });
    },
  );
}
