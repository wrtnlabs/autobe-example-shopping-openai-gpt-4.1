import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_delete_unauthorized(
  connection: api.IConnection,
) {
  /**
   * This test validates that deleting a system configuration is not allowed
   * unless the user is authenticated as an admin.
   *
   * Steps:
   *
   * 1. Register a new admin account (to later create a config with correct
   *    privileges)
   * 2. Create a new system config as the admin
   * 3. Remove Authorization from connection (simulate unauthenticated state)
   * 4. Attempt to delete the configId without any Authorization
   * 5. Confirm that DELETE fails due to lack of authentication (error is thrown)
   *
   * The main focus is to ensure that unauthenticated deletion attempts are
   * denied for security/audit reasons, and no side effect occurs.
   */

  // 1. Register and authenticate as admin (join)
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAiBackendAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        username: adminUsername,
        password_hash: RandomGenerator.alphaNumeric(32),
        name: RandomGenerator.name(),
        email: `${adminUsername}@acme.test`,
        is_active: true,
      } satisfies IShoppingMallAiBackendAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a new system config with admin privileges (now connection is authenticated)
  const config: IShoppingMallAiBackendSystemConfig =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: `test_config_${RandomGenerator.alphaNumeric(5)}`,
          value: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph(),
          effective_from: null,
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(config);

  // 3. Simulate unauthenticated state by removing Authorization header
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to delete the config without Authorization, expect error
  await TestValidator.error(
    "system config deletion without admin auth should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.erase(
        unauthConn,
        {
          configId: config.id,
        },
      );
    },
  );
}
