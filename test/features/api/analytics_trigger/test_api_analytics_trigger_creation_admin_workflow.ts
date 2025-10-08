import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";

/**
 * Test the full admin analytics trigger job creation workflow in the shopping
 * mall platform.
 *
 * Validates:
 *
 * 1. Admin-only access enforcement.
 * 2. Analytics trigger configuration is persisted correctly.
 * 3. Input parameters (type, schedule config, status) are set and validated.
 * 4. Ownership by admin is enforced.
 * 5. Edge cases: duplicate type, invalid schedule JSON, unauthorized attempts.
 */
export async function test_api_analytics_trigger_creation_admin_workflow(
  connection: api.IConnection,
) {
  // Step 1 - Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name(2);

  // Join as admin
  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
      // Omitting status (will default to 'pending')
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(authorizedAdmin);

  // Step 2 - Create a new analytics trigger as the admin
  const triggerType = RandomGenerator.pick([
    "dashboard_update",
    "report_export",
    "data_rebuild",
    "user_engagement",
  ] as const);
  const scheduleConfig = JSON.stringify({
    cron: "0 0 * * *", // daily at midnight
    timezone: "Asia/Seoul",
    repeat: RandomGenerator.pick(["daily", "hourly", "weekly"] as const),
    randomSeed: RandomGenerator.alphaNumeric(8),
  });
  const status = "pending";
  const analyticsTrigger =
    await api.functional.shoppingMall.admin.analyticsTriggers.create(
      connection,
      {
        body: {
          trigger_type: triggerType,
          schedule_config_json: scheduleConfig,
          status,
          shopping_mall_admin_id: authorizedAdmin.id,
          // outcome_log_json is optional, omitted
        } satisfies IShoppingMallAnalyticsTrigger.ICreate,
      },
    );
  typia.assert(analyticsTrigger);

  // Step 3 - Validate created analytics trigger
  TestValidator.equals(
    "trigger_type matches input",
    analyticsTrigger.trigger_type,
    triggerType,
  );
  TestValidator.equals("status matches input", analyticsTrigger.status, status);
  TestValidator.equals(
    "shopping_mall_admin_id matches creator admin",
    analyticsTrigger.shopping_mall_admin_id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "schedule_config_json matches",
    analyticsTrigger.schedule_config_json,
    scheduleConfig,
  );

  // Step 4 - Edge case: duplicate creation (allowed, gets different id)
  const analyticsTriggerDup =
    await api.functional.shoppingMall.admin.analyticsTriggers.create(
      connection,
      {
        body: {
          trigger_type: triggerType,
          schedule_config_json: scheduleConfig,
          status,
          shopping_mall_admin_id: authorizedAdmin.id,
        } satisfies IShoppingMallAnalyticsTrigger.ICreate,
      },
    );
  typia.assert(analyticsTriggerDup);
  TestValidator.notEquals(
    "duplicate trigger gets different id",
    analyticsTriggerDup.id,
    analyticsTrigger.id,
  );

  // Step 5 - Edge case: invalid schedule_config_json (malformed JSON)
  await TestValidator.error(
    "creation with malformed schedule_config_json should fail",
    async () =>
      await api.functional.shoppingMall.admin.analyticsTriggers.create(
        connection,
        {
          body: {
            trigger_type: triggerType,
            schedule_config_json: "not-a-json",
            status: "pending",
            shopping_mall_admin_id: authorizedAdmin.id,
          } satisfies IShoppingMallAnalyticsTrigger.ICreate,
        },
      ),
  );

  // Step 6 - Edge case: unauthorized creation attempt (no admin login)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot create analytics trigger",
    async () =>
      await api.functional.shoppingMall.admin.analyticsTriggers.create(
        unauthConn,
        {
          body: {
            trigger_type: RandomGenerator.pick([
              "dashboard_update",
              "report_export",
              "data_rebuild",
              "user_engagement",
            ] as const),
            schedule_config_json: scheduleConfig,
            status: "pending",
            shopping_mall_admin_id: authorizedAdmin.id,
          } satisfies IShoppingMallAnalyticsTrigger.ICreate,
        },
      ),
  );
}
