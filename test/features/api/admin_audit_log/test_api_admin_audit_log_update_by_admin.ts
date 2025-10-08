import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Validates the admin audit log update workflow.
 *
 * 1. Register a new admin account for update context.
 * 2. Attempt to update an existing admin audit log entry with new data (change
 *    action_reason, action_type, details_json).
 * 3. Validate update is successful, updated fields have the new values.
 * 4. Attempt to update a random (non-existent) audit log id, check for error.
 * 5. Attempt to update with invalid data (malformed details_json: not JSON, empty
 *    update object), check for error.
 * 6. Ensure business rules and error messages are enforced as required.
 */
export async function test_api_admin_audit_log_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a random audit log object (simulate existing log for update)
  const existingLog: IShoppingMallAdminActionLog =
    typia.random<IShoppingMallAdminActionLog>();

  // 3. Update the audit log using the new admin context (change multiple fields)
  const updateBody = {
    action_type: "edit",
    action_reason: RandomGenerator.paragraph({ sentences: 2 }),
    details_json: JSON.stringify({
      previous: "reason",
      correction: "updated info",
    }),
  } satisfies IShoppingMallAdminActionLog.IUpdate;

  const updatedLog: IShoppingMallAdminActionLog =
    await api.functional.shoppingMall.admin.adminAuditLogs.update(connection, {
      adminAuditLogId: existingLog.id,
      body: updateBody,
    });
  typia.assert(updatedLog);
  TestValidator.equals(
    "audit log id should remain the same",
    updatedLog.id,
    existingLog.id,
  );
  TestValidator.equals(
    "action_type must match update",
    updatedLog.action_type,
    updateBody.action_type,
  );
  TestValidator.equals(
    "action_reason must match update",
    updatedLog.action_reason,
    updateBody.action_reason,
  );
  TestValidator.equals(
    "details_json must match update",
    updatedLog.details_json,
    updateBody.details_json,
  );

  // 4. Error: Try to update a non-existent audit log id
  await TestValidator.error(
    "non-existent admin audit log id fails",
    async () => {
      await api.functional.shoppingMall.admin.adminAuditLogs.update(
        connection,
        {
          adminAuditLogId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 5. Error: Invalid details_json (malformed JSON string)
  await TestValidator.error("malformed details_json fails", async () => {
    await api.functional.shoppingMall.admin.adminAuditLogs.update(connection, {
      adminAuditLogId: existingLog.id,
      body: {
        action_type: "edit",
        action_reason: RandomGenerator.paragraph({ sentences: 2 }),
        details_json: "not-a-json-string",
      } satisfies IShoppingMallAdminActionLog.IUpdate,
    });
  });

  // 6. Error: Empty update (no fields)
  await TestValidator.error("empty update object fails", async () => {
    await api.functional.shoppingMall.admin.adminAuditLogs.update(connection, {
      adminAuditLogId: existingLog.id,
      body: {} satisfies IShoppingMallAdminActionLog.IUpdate,
    });
  });
}
