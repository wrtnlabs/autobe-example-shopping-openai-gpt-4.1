import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionLog";

/**
 * E2E test for creating an admin action log entry.
 *
 * 1. Register a new admin account using valid random data (email, password,
 *    full_name).
 * 2. Use the returned admin's UUID for subsequent log creation and assert
 *    authentication is successful.
 * 3. As the authenticated admin, create a new action log entry via
 *    /shoppingMall/admin/adminActionLogs using all required fields:
 *
 *    - Shopping_mall_admin_id: the admin's own UUID
 *    - Action_type: set to 'approval'
 *    - Action_reason: provide a random, realistic operational reason
 *    - Domain: set to 'product' for a typical event
 *    - Affected_product_id: provide a valid UUID as affected entity
 * 4. Assert the API response matches the sent values (all fields present, correct
 *    admin id, correct mapping)
 * 5. Validate response with typia.assert() and use TestValidator to confirm both
 *    the admin id and the affected_product_id are accurately linked in the log
 *    entry.
 */
export async function test_api_admin_action_log_creation_success(
  connection: api.IConnection,
) {
  // 1. Register new admin (dependency)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);

  // 2. Create log entry referring to this admin
  const affectedProductId = typia.random<string & tags.Format<"uuid">>();
  const logInput = {
    shopping_mall_admin_id: adminAuth.id,
    affected_product_id: affectedProductId,
    action_type: "approval",
    action_reason: RandomGenerator.paragraph({ sentences: 3 }),
    domain: "product",
  } satisfies IShoppingMallAdminActionLog.ICreate;
  const log = await api.functional.shoppingMall.admin.adminActionLogs.create(
    connection,
    {
      body: logInput,
    },
  );
  typia.assert(log);
  TestValidator.equals(
    "log admin_id should match created admin",
    log.shopping_mall_admin_id,
    adminAuth.id,
  );
  TestValidator.equals(
    "log affected_product_id should match input",
    log.affected_product_id,
    affectedProductId,
  );
  TestValidator.equals(
    "log action_type is correct",
    log.action_type,
    "approval",
  );
  TestValidator.equals("log domain is 'product'", log.domain, "product");
}
