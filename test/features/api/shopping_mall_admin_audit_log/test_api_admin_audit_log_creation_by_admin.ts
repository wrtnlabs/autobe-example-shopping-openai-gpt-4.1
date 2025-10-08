import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminAuditLog";

/**
 * Validate admin audit log creation by an authenticated admin, covering
 * positive and negative flows.
 *
 * This e2e test performs the following operations:
 *
 * 1. Registers a new admin via /auth/admin/join with valid, randomly-generated
 *    credentials (email, password, full_name).
 * 2. Authenticates as the newly registered admin (token set by API automatically).
 * 3. Issues POST /shoppingMall/admin/adminAuditLogs with a valid
 *    IShoppingMallAdminAuditLog.ICreate payload:
 *
 *    - Shopping_mall_admin_id: taken from registered admin's UUID
 *    - Audit_event_type: realistic string (e.g. 'login', 'permission_grant')
 *    - Domain: meaningful domain string (e.g. 'platform', 'user_management')
 *    - Log_level: valid log level string (e.g. 'info', 'warning', 'critical')
 *    - Event_context_json: optional; could be simple JSON stringified object or
 *         omitted for basic test
 * 4. Asserts the response matches IShoppingMallAdminAuditLog (all key attributes
 *    match input, created_at is ISO8601, has UUID).
 * 5. Attempts to create another audit log entry without authentication by
 *    stripping the token; expects an error.
 * 6. Ensures business constraints: only admins can create logs, all fields must
 *    comply with schema, and errors are properly returned for invalid
 *    requests.
 */
export async function test_api_admin_audit_log_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin and authenticate
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Successfully create admin audit log
  const logPayload = {
    shopping_mall_admin_id: admin.id,
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
    log_level: RandomGenerator.pick(["info", "warning", "critical"] as const),
    event_context_json: JSON.stringify({
      ip: "127.0.0.1",
      session: RandomGenerator.alphaNumeric(16),
    }),
  } satisfies IShoppingMallAdminAuditLog.ICreate;
  const auditLog: IShoppingMallAdminAuditLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.create(connection, {
      body: logPayload,
    });
  typia.assert(auditLog);
  TestValidator.equals(
    "admin ID matches",
    auditLog.shopping_mall_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "audit event type matches",
    auditLog.audit_event_type,
    logPayload.audit_event_type,
  );
  TestValidator.equals("domain matches", auditLog.domain, logPayload.domain);
  TestValidator.equals(
    "log_level matches",
    auditLog.log_level,
    logPayload.log_level,
  );
  TestValidator.equals(
    "event_context_json matches",
    auditLog.event_context_json,
    logPayload.event_context_json,
  );

  // 3. Negative case: Unauthenticated (token stripped) should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin audit log creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.create(
        unauthConn,
        { body: logPayload },
      );
    },
  );
}
