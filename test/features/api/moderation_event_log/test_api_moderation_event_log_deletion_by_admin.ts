import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";

/**
 * E2E test for permanent deletion of a moderation event log by an admin user.
 *
 * This test performs a complete admin join, moderation event log creation,
 * deletion, and error validation cycle:
 *
 * 1. Register a new admin user using the admin join API to obtain admin rights.
 * 2. Create a moderation event log entry as the new admin.
 * 3. Permanently delete the created moderation event log entry by its
 *    moderationEventLogId.
 * 4. Attempt to delete the same moderation event log again to ensure the system
 *    returns an error.
 * 5. (Edge) Attempt to delete with a random non-existent moderationEventLogId and
 *    confirm error response.
 *
 * Steps:
 *
 * - Validates successful deletion flow (no error thrown on first delete call)
 * - Ensures subsequent deletion attempts of the same log fail
 * - Ensures deletion with a random UUID fails as expected
 */
export async function test_api_moderation_event_log_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const full_name = RandomGenerator.name();
  const adminResp: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password,
        full_name,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminResp);

  // 2. Create a moderation event log
  const moderationLog: IShoppingMallModerationEventLog =
    await api.functional.shoppingMall.admin.moderationEventLogs.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminResp.id,
          event_type: RandomGenerator.pick([
            "flag",
            "removal",
            "approval",
            "annotation",
            "warning",
            "escalation",
          ] as const),
          moderation_message: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IShoppingMallModerationEventLog.ICreate,
      },
    );
  typia.assert(moderationLog);

  // 3. Permanently delete the moderation event log (should not throw)
  await api.functional.shoppingMall.admin.moderationEventLogs.erase(
    connection,
    {
      moderationEventLogId: moderationLog.id,
    },
  );
  // If no error is thrown, deletion is successful.

  // 4. Attempt to delete the same moderation event log again (should error)
  await TestValidator.error(
    "should not delete already deleted moderation event log",
    async () => {
      await api.functional.shoppingMall.admin.moderationEventLogs.erase(
        connection,
        {
          moderationEventLogId: moderationLog.id,
        },
      );
    },
  );

  // 5. Attempt to delete a random (non-existent) moderation event log id (should error)
  await TestValidator.error(
    "should not delete non-existent moderation event log",
    async () => {
      await api.functional.shoppingMall.admin.moderationEventLogs.erase(
        connection,
        {
          moderationEventLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
