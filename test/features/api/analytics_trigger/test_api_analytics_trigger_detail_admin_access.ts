import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";

/**
 * Validates admin retrieval of analytics trigger details by id.
 *
 * 1. Register and authenticate a new admin.
 * 2. Create an analytics trigger config as that admin.
 * 3. Fetch by id and assert all core fields match creation.
 * 4. Edge: Try fetch by random (non-existent) id and verify error.
 */
export async function test_api_analytics_trigger_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new admin
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(10),
      full_name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminReg);

  // 2. Create a new analytics trigger as this admin
  const createBody = {
    trigger_type: RandomGenerator.pick([
      "dashboard_update",
      "report_export",
      "data_rebuild",
    ] as const),
    schedule_config_json: JSON.stringify({
      cron: "0 0 * * 0",
      timezone: "Asia/Seoul",
      note: RandomGenerator.paragraph(),
    }),
    status: "pending",
    shopping_mall_admin_id: adminReg.id,
  } satisfies IShoppingMallAnalyticsTrigger.ICreate;
  const trigger =
    await api.functional.shoppingMall.admin.analyticsTriggers.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(trigger);

  // 3. Retrieve this trigger by id and validate
  const gotten = await api.functional.shoppingMall.admin.analyticsTriggers.at(
    connection,
    {
      analyticsTriggerId: trigger.id,
    },
  );
  typia.assert(gotten);
  TestValidator.equals(
    "analytics trigger detail matches creation",
    gotten.trigger_type,
    createBody.trigger_type,
  );
  TestValidator.equals(
    "schedule_config_json matches",
    gotten.schedule_config_json,
    createBody.schedule_config_json,
  );
  TestValidator.equals("status matches", gotten.status, createBody.status);
  TestValidator.equals(
    "admin assignment matches",
    gotten.shopping_mall_admin_id,
    adminReg.id,
  );
  TestValidator.equals("id match", gotten.id, trigger.id);
  TestValidator.equals("created_at exists", typeof gotten.created_at, "string");
  TestValidator.equals("updated_at exists", typeof gotten.updated_at, "string");

  // 4. Try fetching non-existent analytics trigger by random uuid
  await TestValidator.error("fetch random trigger id fails", async () => {
    await api.functional.shoppingMall.admin.analyticsTriggers.at(connection, {
      analyticsTriggerId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
