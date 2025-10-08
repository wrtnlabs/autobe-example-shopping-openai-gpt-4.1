import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAnalyticsTrigger } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAnalyticsTrigger";

/**
 * Validate permanent deletion of an analytics trigger by admin (hard-delete).
 *
 * Scenario:
 *
 * 1. Register a new admin via /auth/admin/join and obtain authentication.
 * 2. As that admin, create a new analytics trigger (POST
 *    /shoppingMall/admin/analyticsTriggers).
 * 3. Issue DELETE /shoppingMall/admin/analyticsTriggers/:analyticsTriggerId for
 *    the newly created trigger.
 * 4. Attempt to delete the same trigger again, expecting an error response.
 * 5. Attempt to delete a completely non-existent analyticsTriggerId, expecting an
 *    error response.
 * 6. (Edge case) Attempt deletion as an unauthenticated client and a non-admin
 *    (skipped unless another non-admin authentication endpoint is provided).
 */
export async function test_api_analytics_trigger_erase_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin and obtain admin auth
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminFullName: string = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123!",
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);
  TestValidator.equals("admin email matches", adminJoin.email, adminEmail);

  // 2. Create new analytics trigger as admin
  const triggerCreate =
    await api.functional.shoppingMall.admin.analyticsTriggers.create(
      connection,
      {
        body: {
          trigger_type: RandomGenerator.paragraph({ sentences: 2 }),
          schedule_config_json: JSON.stringify({
            cron: "0 2 * * *",
            timeZone: "Asia/Seoul",
          }),
          status: "pending",
          shopping_mall_admin_id: adminJoin.id,
        } satisfies IShoppingMallAnalyticsTrigger.ICreate,
      },
    );
  typia.assert(triggerCreate);
  TestValidator.equals(
    "admin who created trigger",
    triggerCreate.shopping_mall_admin_id,
    adminJoin.id,
  );

  // 3. Erase the trigger (admin action)
  await api.functional.shoppingMall.admin.analyticsTriggers.erase(connection, {
    analyticsTriggerId: triggerCreate.id,
  });

  // 4. Attempt to erase same trigger again (expect error)
  await TestValidator.error(
    "second erase should fail for already deleted trigger",
    async () => {
      await api.functional.shoppingMall.admin.analyticsTriggers.erase(
        connection,
        {
          analyticsTriggerId: triggerCreate.id,
        },
      );
    },
  );

  // 5. Attempt to erase a random non-existent trigger ID (expect error)
  await TestValidator.error(
    "erase with non-existent analyticsTriggerId should fail",
    async () => {
      await api.functional.shoppingMall.admin.analyticsTriggers.erase(
        connection,
        {
          analyticsTriggerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 6. Optionally: Try unauthenticated deletion (should fail because no token is present)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot erase analytics trigger",
    async () => {
      await api.functional.shoppingMall.admin.analyticsTriggers.erase(
        unauthConn,
        {
          analyticsTriggerId: triggerCreate.id,
        },
      );
    },
  );
}
