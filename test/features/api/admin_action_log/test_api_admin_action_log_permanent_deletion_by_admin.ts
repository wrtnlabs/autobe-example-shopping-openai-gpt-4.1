import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Test permanent deletion of admin action logs by admin.
 *
 * Scenario:
 *
 * 1. Register a new admin user
 * 2. Authenticate as the admin
 * 3. Create an admin action log entry by the admin
 * 4. Delete (erase) the admin action log by ID
 * 5. Verify deletion (success and not retrievable)
 * 6. Attempt to delete a non-existent action log (expect error)
 * 7. Attempt deletion as unauthorized (should be denied)
 */
export async function test_api_admin_action_log_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminResult);

  // 2. Authenticate as this admin is implicit (join returns token)

  // 3. Create an admin action log entry
  const actionLog =
    await api.functional.shoppingMall.admin.adminActionLogs.create(connection, {
      body: {
        shopping_mall_admin_id: adminResult.id,
        action_type: RandomGenerator.paragraph({ sentences: 1 }),
        action_reason: RandomGenerator.paragraph({ sentences: 2 }),
        domain: "system",
      } satisfies IShoppingMallAdminActionLog.ICreate,
    });
  typia.assert(actionLog);

  // 4. Delete the admin action log (permanent deletion)
  await api.functional.shoppingMall.admin.adminActionLogs.erase(connection, {
    adminActionLogId: actionLog.id,
  });
  // 5. Attempt to "retrieve" the deleted entry: Not possible, skip (would expect 404 if GET supported)

  // 6. Attempt to delete a non-existent admin action log
  await TestValidator.error(
    "error on erase non-existent admin action log",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.erase(
        connection,
        {
          adminActionLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. Attempt deletion as unauthorized: simulate unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user cannot erase admin action log",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.erase(
        unauthConn,
        {
          adminActionLogId: actionLog.id,
        },
      );
    },
  );
}
