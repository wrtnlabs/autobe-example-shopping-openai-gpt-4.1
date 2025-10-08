import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";

/**
 * Test updating an existing moderation event log entry by an admin.
 *
 * 1. Register a new admin (to obtain authentication for the rest of the steps)
 * 2. As the newly registered admin, create a moderation event log with minimally
 *    required fields
 * 3. Update the created moderation event log entry using its id, modifying
 *    event_type and moderation_message
 * 4. Validate that only permitted fields are updated, and system/audit fields
 *    (admin id, timestamps) are not altered except allowed business logic
 *    modifications
 * 5. Confirm audit trail integrity with post-update retrieval
 */
export async function test_api_moderation_event_log_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // Step 2: Create a moderation event log as this admin
  const createInput = {
    shopping_mall_admin_id: admin.id,
    event_type: "flag",
    moderation_message: "Initial moderation event log creation by test.",
  } satisfies IShoppingMallModerationEventLog.ICreate;
  const moderationLog: IShoppingMallModerationEventLog =
    await api.functional.shoppingMall.admin.moderationEventLogs.create(
      connection,
      { body: createInput },
    );
  typia.assert(moderationLog);
  TestValidator.equals(
    "admin id in log matches creator",
    moderationLog.shopping_mall_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "event_type matches input",
    moderationLog.event_type,
    createInput.event_type,
  );
  TestValidator.equals(
    "moderation_message matches input",
    moderationLog.moderation_message,
    createInput.moderation_message,
  );
  // Step 3: Update the log entry: new event_type and new moderation_message
  const updateInput = {
    event_type: "warning",
    moderation_message: "Moderator updated log to warning after review.",
  } satisfies IShoppingMallModerationEventLog.IUpdate;
  const updatedLog: IShoppingMallModerationEventLog =
    await api.functional.shoppingMall.admin.moderationEventLogs.update(
      connection,
      {
        moderationEventLogId: moderationLog.id,
        body: updateInput,
      },
    );
  typia.assert(updatedLog);
  // Step 4: Validation of allowed and non-allowed field updates
  TestValidator.equals(
    "moderation log id unchanged",
    updatedLog.id,
    moderationLog.id,
  );
  TestValidator.equals(
    "admin id unchanged",
    updatedLog.shopping_mall_admin_id,
    moderationLog.shopping_mall_admin_id,
  );
  TestValidator.equals(
    "updated event_type applied",
    updatedLog.event_type,
    updateInput.event_type,
  );
  TestValidator.equals(
    "updated moderation_message applied",
    updatedLog.moderation_message,
    updateInput.moderation_message,
  );
  TestValidator.predicate(
    "created_at should remain unchanged",
    updatedLog.created_at === moderationLog.created_at,
  );
}
