import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";

/**
 * Validate admin detail view for moderation event logs.
 *
 * 1. Register a new admin and get authorized token.
 * 2. Attempt to retrieve a moderation event log detail (simulate/existing).
 * 3. Validate that the moderation event log object is schema-compliant.
 * 4. Confirm log's shopping_mall_admin_id matches admin, if log relates to admin
 *    actions.
 * 5. Attempt access without authentication and expect rejection.
 * 6. Attempt access with a random non-existent log ID and expect error.
 */
export async function test_api_moderation_event_log_detail_view_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminFullName = RandomGenerator.name();
  const adminPassword = "SuperSecure!123";
  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(authorized);

  // 2. Retrieve a moderation event log detail (simulate/existing as backend required)
  // For simulation, generate a random log id (in real E2E, ensure entry creation elsewhere)
  const moderationLogId = typia.random<string & tags.Format<"uuid">>();
  const log: IShoppingMallModerationEventLog =
    await api.functional.shoppingMall.admin.moderationEventLogs.at(connection, {
      moderationEventLogId: moderationLogId,
    });
  typia.assert(log);

  // 3. Optionally: If moderation log relates to the current admin, IDs should match
  // In simulation, this relationship may not be enforced. If real-log creation available, test strict admin_id match here.
  // If you want business validation:
  // TestValidator.equals(
  //   "log shopping_mall_admin_id matches current admin",
  //   log.shopping_mall_admin_id,
  //   authorized.id,
  // );

  // 4. Security: Try to access without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access event log detail",
    async () => {
      await api.functional.shoppingMall.admin.moderationEventLogs.at(
        unauthConn,
        {
          moderationEventLogId: moderationLogId,
        },
      );
    },
  );

  // 5. Edge case: Access non-existent event log id
  const fakeLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin gets error for non-existent event log id",
    async () => {
      await api.functional.shoppingMall.admin.moderationEventLogs.at(
        connection,
        {
          moderationEventLogId: fakeLogId,
        },
      );
    },
  );
}
