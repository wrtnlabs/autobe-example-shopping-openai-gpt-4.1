import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";

/**
 * Validate that admin can retrieve detail of a specific admin audit log entry
 * by its unique id.
 *
 * Steps:
 *
 * 1. Register & login as admin; obtain id and token
 * 2. Create new admin audit log entry using authenticated session
 * 3. Retrieve audit log by id and validate all fields match input/response
 * 4. Attempt access without authentication; expect failure
 * 5. Attempt lookup with unknown uuid; expect error
 */
export async function test_api_admin_audit_log_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register/login as admin to get valid token and admin id
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const fullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        full_name: fullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches input", admin.email, email);
  TestValidator.equals(
    "admin full name matches input",
    admin.full_name,
    fullName,
  );
  TestValidator.equals("admin status active", admin.status, "active");
  const adminId = admin.id;

  // 2. Create new admin audit log entry using admin id
  const logCreate = {
    shopping_mall_admin_id: adminId,
    audit_event_type: RandomGenerator.pick([
      "login",
      "permission_grant",
      "system_setting",
      "ban",
      "account_unlock",
      "delete_entity",
    ] as const),
    domain: RandomGenerator.pick([
      "platform",
      "user_management",
      "orders",
      "catalog",
      "reviews",
    ] as const),
    event_context_json: JSON.stringify({
      ip: "127.0.0.1",
      details: RandomGenerator.paragraph({ sentences: 3 }),
    }),
    log_level: RandomGenerator.pick(["info", "warning", "critical"] as const),
  } satisfies IShoppingMallAdminAuditLog.ICreate;
  const createdLog: IShoppingMallAdminAuditLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.create(connection, {
      body: logCreate,
    });
  typia.assert(createdLog);
  TestValidator.equals(
    "created log admin id",
    createdLog.shopping_mall_admin_id,
    adminId,
  );
  TestValidator.equals(
    "created log audit_event_type matches",
    createdLog.audit_event_type,
    logCreate.audit_event_type,
  );
  TestValidator.equals(
    "created log domain matches",
    createdLog.domain,
    logCreate.domain,
  );
  TestValidator.equals(
    "created log event_context_json matches",
    createdLog.event_context_json,
    logCreate.event_context_json,
  );
  TestValidator.equals(
    "created log log_level matches",
    createdLog.log_level,
    logCreate.log_level,
  );

  // 3. Retrieve audit log by ID as authenticated admin
  const retrievedLog: IShoppingMallAdminAuditLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
      adminAuditLogId: createdLog.id,
    });
  typia.assert(retrievedLog);
  TestValidator.equals(
    "retrieved log matches created log",
    retrievedLog,
    createdLog,
  );

  // 4. Unauthenticated access (empty headers): expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated should fail to get audit log",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.at(unauthConn, {
        adminAuditLogId: createdLog.id,
      });
    },
  );

  // 5. Lookup with unknown uuid should throw error
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent audit log id should error",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.at(connection, {
        adminAuditLogId: nonExistentId,
      });
    },
  );
}
