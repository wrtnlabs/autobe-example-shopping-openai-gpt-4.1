import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallModerationEventLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallModerationEventLog";

/**
 * Test the creation of a moderation event log entry by an admin.
 *
 * 1. Register a new admin via admin join (to get a valid admin user and
 *    authentication).
 * 2. Use the admin's ID to create a moderation event log via the
 *    moderationEventLogs.create API, with realistic entity references and
 *    moderation message.
 * 3. Assert the event log is created, all required fields are set,
 *    shopping_mall_admin_id matches the admin, the event_type and
 *    moderation_message are correct, and entity references are stored.
 */
export async function test_api_moderation_event_log_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminAuthorized);

  // 2. Create the moderation event log (simulate event about a product for example)
  const affectedProductId = typia.random<string & tags.Format<"uuid">>();
  const eventType = RandomGenerator.pick([
    "flag",
    "removal",
    "approval",
    "annotation",
    "warning",
    "escalation",
  ] as const);
  const moderationMessage = RandomGenerator.paragraph({ sentences: 5 });

  const eventLog: IShoppingMallModerationEventLog =
    await api.functional.shoppingMall.admin.moderationEventLogs.create(
      connection,
      {
        body: {
          shopping_mall_admin_id: adminAuthorized.id,
          affected_product_id: affectedProductId,
          event_type: eventType,
          moderation_message: moderationMessage,
        } satisfies IShoppingMallModerationEventLog.ICreate,
      },
    );
  typia.assert(eventLog);

  // 3. Assert the event log is correctly created
  TestValidator.equals(
    "shopping_mall_admin_id matches",
    eventLog.shopping_mall_admin_id,
    adminAuthorized.id,
  );
  TestValidator.equals("event_type matches", eventLog.event_type, eventType);
  TestValidator.equals(
    "moderation_message matches",
    eventLog.moderation_message,
    moderationMessage,
  );
  TestValidator.equals(
    "affected_product_id matches",
    eventLog.affected_product_id,
    affectedProductId,
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof eventLog.created_at === "string" &&
      !!eventLog.created_at.match(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/,
      ),
  );
}
