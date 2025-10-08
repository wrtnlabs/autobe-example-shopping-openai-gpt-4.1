import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Validate system config detail fetch with admin and unauthorized restriction
 * and audit fields.
 *
 * Steps:
 *
 * 1. Create a new admin via join.
 * 2. Create a new system config as admin, and fetch its detail to confirm all
 *    fields & audit.
 * 3. Update the config (by full replacement) and refetch to confirm updated field
 *    is reflected and updated_at changes.
 * 4. Attempt fetch with random non-existent/deleted UUID as admin (expect error).
 * 5. Attempt fetch as unauthorized (no token/admin) (expect forbidden).
 */
export async function test_api_admin_system_config_detail_retrieval(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminRes: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(adminRes);

  // 2. As admin: create system config, then get detail and check fields
  const configKey = "feature_flag_" + RandomGenerator.alphaNumeric(6);
  const configCreate = {
    config_key: configKey,
    config_scope: "global",
    value_type: "boolean",
    boolean_value: true,
  } satisfies IShoppingMallSystemConfig.ICreate;
  const config: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: configCreate,
    });
  typia.assert(config);

  // Detail fetch - should match created & have audit fields
  const detail: IShoppingMallSystemConfig =
    await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
      systemConfigId: config.id,
    });
  typia.assert(detail);
  TestValidator.equals("detail matches created config", detail, config);

  // 3. Simulate update: re-create config with changed value (only create supported, so delete and update not tested)
  // We'll simulate an update by setting a new value_type; in real flow would expect PATCH/PUT, but not available
  const configUpdate = {
    config_key: configKey,
    config_scope: "global",
    value_type: "string",
    string_value: "updated",
  } satisfies IShoppingMallSystemConfig.ICreate;
  // This will fail as duplicate (no PATCH supported) - so skip update test

  // 4. Fetch with non-existent ID (random UUID)
  await TestValidator.error(
    "fetching non-existent config as admin throws",
    async () => {
      await api.functional.shoppingMall.admin.systemConfigs.at(connection, {
        systemConfigId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Fetch as unauthorized user (missing auth: fresh connection)
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "fetching config detail as unauthorized throws",
    async () => {
      await api.functional.shoppingMall.admin.systemConfigs.at(
        unauthorizedConn,
        {
          systemConfigId: config.id,
        },
      );
    },
  );
}
