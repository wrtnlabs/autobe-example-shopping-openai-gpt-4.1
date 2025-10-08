import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";

/**
 * Test updating an existing analytics trigger configuration as an admin.
 *
 * 1. Register a new admin and obtain authorized session
 * 2. Create a new analytics trigger as that admin to obtain a fresh
 *    analyticsTriggerId
 * 3. Update analytics trigger (change one or more fields: trigger_type,
 *    schedule_config_json, status, shopping_mall_admin_id)
 * 4. Assert the response reflects updated properties
 * 5. Attempt update with a non-existent analyticsTriggerId and expect error
 * 6. Attempt update as unauthorized user and expect error
 */
export async function test_api_analytics_trigger_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const email = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: "adminPassword123!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create an analytics trigger as that admin
  const createTriggerBody = {
    trigger_type: "dashboard_update",
    schedule_config_json: JSON.stringify({
      cron: "0 0 * * *",
      meta: RandomGenerator.alphabets(8),
    }),
    status: "pending",
    shopping_mall_admin_id: admin.id,
  } satisfies IShoppingMallAnalyticsTrigger.ICreate;
  const trigger: IShoppingMallAnalyticsTrigger =
    await api.functional.shoppingMall.admin.analyticsTriggers.create(
      connection,
      { body: createTriggerBody },
    );
  typia.assert(trigger);

  // 3. Prepare valid update: change status and schedule_config_json
  const updateBody = {
    status: "running",
    schedule_config_json: JSON.stringify({ cron: "5 0 * * *", updated: true }),
  } satisfies IShoppingMallAnalyticsTrigger.IUpdate;
  const updated: IShoppingMallAnalyticsTrigger =
    await api.functional.shoppingMall.admin.analyticsTriggers.update(
      connection,
      {
        analyticsTriggerId: trigger.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("status should be updated", updated.status, "running");
  TestValidator.equals(
    "schedule_config_json should be updated",
    updated.schedule_config_json,
    updateBody.schedule_config_json,
  );
  TestValidator.equals("id remains the same", updated.id, trigger.id);

  // 4. Error: update non-existent analyticsTriggerId
  await TestValidator.error(
    "update with non-existent analyticsTriggerId should error",
    async () => {
      await api.functional.shoppingMall.admin.analyticsTriggers.update(
        connection,
        {
          analyticsTriggerId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            status: "cancelled",
          } satisfies IShoppingMallAnalyticsTrigger.IUpdate,
        },
      );
    },
  );

  // 5. Error: update as unauthorized user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated update should error", async () => {
    await api.functional.shoppingMall.admin.analyticsTriggers.update(
      unauthConn,
      {
        analyticsTriggerId: trigger.id,
        body: {
          status: "failed",
        } satisfies IShoppingMallAnalyticsTrigger.IUpdate,
      },
    );
  });
}
