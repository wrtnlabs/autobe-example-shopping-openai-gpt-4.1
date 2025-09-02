import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Successfully hard delete a system configuration entry as an
   * admin.
   *
   * Business goal: End-to-end validation that an admin can create a system
   * configuration entry, delete it permanently via the API, and that the record
   * is fully removed from the system (hard delete, not soft delete). No detail
   * query is possible after deletion and no partial traces may remain. All
   * required authentication and resource dependencies must be established
   * beforehand.
   *
   * Steps:
   *
   * 1. Register a new admin (establish authentication context)
   * 2. Create a new system configuration entry with random but valid data
   * 3. Permanently delete this configuration using its configId
   * 4. Confirm that attempting to delete again fails or record is missing
   *
   * Expected: Configuration record is not available for detail queries after
   * deletion and is irreversibly removed. Errors must be handled properly for
   * repeated/invalid deletions. Note: No config detail query API is available,
   * so absolute nonexistence can only be inferred by error on repeated delete.
   */

  // 1. Register a new admin
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminRegInput = {
    username: RandomGenerator.alphaNumeric(12),
    password_hash: adminPassword,
    name: RandomGenerator.name(),
    email: `${RandomGenerator.alphaNumeric(8)}@e2etest.dev`,
    is_active: true,
  } satisfies IShoppingMallAiBackendAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminRegInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "authenticated admin username matches",
    adminAuth.admin.username,
    adminRegInput.username,
  );

  // 2. Create new system config entry
  const configCreateInput = {
    key: `test_key_${RandomGenerator.alphaNumeric(6)}`,
    value: RandomGenerator.alphaNumeric(32),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: null,
    effective_to: null,
  } satisfies IShoppingMallAiBackendSystemConfig.ICreate;
  const config =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      { body: configCreateInput },
    );
  typia.assert(config);
  TestValidator.equals(
    "system config created key matches input",
    config.key,
    configCreateInput.key,
  );
  const configId = config.id;

  // 3. Permanently delete config by id
  await api.functional.shoppingMallAiBackend.admin.systemConfigs.erase(
    connection,
    { configId },
  );

  // 4. Ensure deletion is irreversible - additional delete should error
  await TestValidator.error(
    "deleted configId cannot be deleted again",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.erase(
        connection,
        { configId },
      );
    },
  );
}
