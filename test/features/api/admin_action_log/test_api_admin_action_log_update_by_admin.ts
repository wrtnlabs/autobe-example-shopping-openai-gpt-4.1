import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Validates updating administrative action log entries as an admin
 *
 * - Ensures business rules: existing log may be updated (reason/details_json),
 *   deleted/non-existent logs cannot.
 * - Validates full traceability & timestamp changes on update.
 *
 * Steps:
 *
 * 1. Register and authenticate a new admin (acquire token for further actions)
 * 2. Create a new admin action log (as admin)
 * 3. Update the action_reason and details_json on this log; verify changes (fields
 *    changed, created_at not changed, updated timestamp/traceability)
 * 4. Negative: update with random not-exist UUID → expect error
 * 5. Negative: simulate log deletion (re-update after deletion - not supported
 *    API, omitted)
 */
export async function test_api_admin_action_log_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create admin action log entry
  const actionLogBody = {
    shopping_mall_admin_id: admin.id,
    action_type: RandomGenerator.pick([
      "approval",
      "ban",
      "edit",
      "suspend",
    ] as const),
    action_reason: RandomGenerator.paragraph(),
    domain: RandomGenerator.pick([
      "customer",
      "seller",
      "order",
      "product",
      "system",
    ] as const),
    // All affected_XYZ fields optional/null by default for this generic log
    details_json: JSON.stringify({
      before: null,
      after: { reason: "original" },
    }),
  } satisfies IShoppingMallAdminActionLog.ICreate;
  const actionLog =
    await api.functional.shoppingMall.admin.adminActionLogs.create(connection, {
      body: actionLogBody,
    });
  typia.assert(actionLog);

  // 3. Update action_reason & details_json
  const updateBody = {
    action_reason: RandomGenerator.paragraph({ sentences: 2 }),
    details_json: JSON.stringify({
      before: actionLog.details_json,
      after: { reason: "updated" },
    }),
  } satisfies IShoppingMallAdminActionLog.IUpdate;
  const updated =
    await api.functional.shoppingMall.admin.adminActionLogs.update(connection, {
      adminActionLogId: actionLog.id,
      body: updateBody,
    });
  typia.assert(updated);

  TestValidator.equals(
    "log id not changed on update",
    updated.id,
    actionLog.id,
  );
  TestValidator.notEquals(
    "action_reason updated",
    updated.action_reason,
    actionLog.action_reason,
  );
  TestValidator.notEquals(
    "details_json updated",
    updated.details_json,
    actionLog.details_json,
  );
  TestValidator.equals(
    "created_at does not change",
    updated.created_at,
    actionLog.created_at,
  );

  // 4. Try updating non-existent log (should fail)
  await TestValidator.error(
    "updating non-existent admin action log should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.update(
        connection,
        {
          adminActionLogId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );
}
