import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * Validate detailed retrieval and RBAC enforcement for an admin action log.
 *
 * This test ensures that an admin can retrieve detailed information for a
 * specific admin action log entry, all required fields are returned, RBAC is
 * enforced (only admin can access), and proper errors are returned for
 * non-existent log IDs or unauthorized access.
 *
 * Steps:
 *
 * 1. Register a new admin using POST /auth/admin/join with random
 *    email/password/full_name
 * 2. The admin session is initialized (join responds with IAuthorized)
 * 3. Create an admin action log as this admin via POST
 *    /shoppingMall/admin/adminActionLogs, with acting admin ID from step 1,
 *    sample action_type, reason, and domain
 * 4. Retrieve the action log with GET
 *    /shoppingMall/admin/adminActionLogs/{adminActionLogId} using the ID from
 *    step 3, and verify all fields, especially shopping_mall_admin_id matches
 *    the acting admin
 * 5. Attempt to fetch with a random invalid adminActionLogId (should fail)
 * 6. Attempt to fetch as a non-admin (simulate this with a fresh, unauthenticated
 *    connection, should fail)
 */
export async function test_api_admin_action_log_detail_view_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and get admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminFullName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: adminFullName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create an admin action log as this admin
  const logCreate =
    await api.functional.shoppingMall.admin.adminActionLogs.create(connection, {
      body: {
        shopping_mall_admin_id: adminJoin.id,
        action_type: "edit",
        action_reason: RandomGenerator.paragraph(),
        domain: "system",
        details_json: JSON.stringify({
          context: "initial admin creation test",
        }),
      } satisfies IShoppingMallAdminActionLog.ICreate,
    });
  typia.assert(logCreate);

  // 3. Retrieve the log by ID as admin
  const logFetched = await api.functional.shoppingMall.admin.adminActionLogs.at(
    connection,
    {
      adminActionLogId: logCreate.id,
    },
  );
  typia.assert(logFetched);

  // 4. Validate all log fields and correct admin ownership
  TestValidator.equals(
    "fetched log id matches created log id",
    logFetched.id,
    logCreate.id,
  );
  TestValidator.equals(
    "log's shopping_mall_admin_id matches",
    logFetched.shopping_mall_admin_id,
    adminJoin.id,
  );
  TestValidator.equals(
    "log action_type matches",
    logFetched.action_type,
    logCreate.action_type,
  );
  TestValidator.equals(
    "log action_reason matches",
    logFetched.action_reason,
    logCreate.action_reason,
  );
  TestValidator.equals(
    "log domain matches",
    logFetched.domain,
    logCreate.domain,
  );
  TestValidator.equals(
    "log details_json matches",
    logFetched.details_json,
    logCreate.details_json,
  );

  // 5. Attempt to fetch with a random invalid log ID (should error)
  await TestValidator.error(
    "retrieving a non-existent action log fails",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.at(connection, {
        adminActionLogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6. Attempt to fetch as a non-admin (simulate with fresh unauthenticated connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated cannot view admin action log",
    async () => {
      await api.functional.shoppingMall.admin.adminActionLogs.at(unauthConn, {
        adminActionLogId: logCreate.id,
      });
    },
  );
}
