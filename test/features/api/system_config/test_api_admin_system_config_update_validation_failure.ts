import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_update_validation_failure(
  connection: api.IConnection,
) {
  /**
   * E2E test: System config update validation failures
   *
   * This test ensures robust backend validation enforcement on system config
   * update. Steps:
   *
   * 1. Registers an admin
   * 2. Creates a config
   * 3. Attempts invalid updates (empty key; value as null)
   * 4. Asserts update fails each time and config is left unchanged.
   *
   * Only provided DTO and API SDK are used. No compile-time type bypass is
   * performed except deliberately to provoke runtime validation failure.
   */

  // 1. Register and authenticate admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.name(),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: `${RandomGenerator.alphabets(10)}@company.com`,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a valid system configuration
  const config =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphabets(10),
          value: RandomGenerator.alphaNumeric(20),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          effective_from: null,
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(config);

  // 3. Failure case: update with empty config key
  await TestValidator.error(
    "system config update fails with empty key",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.update(
        connection,
        {
          configId: config.id,
          body: {
            key: "",
          } satisfies IShoppingMallAiBackendSystemConfig.IUpdate,
        },
      );
    },
  );

  // 4. Failure case: value property set to null (type error at runtime)
  await TestValidator.error(
    "system config update fails with null value",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.update(
        connection,
        {
          configId: config.id,
          body: {
            value: null as unknown as string,
          } satisfies IShoppingMallAiBackendSystemConfig.IUpdate,
        },
      );
    },
  );

  // 5. (Optional) To verify config is unchanged, a 'get' endpoint would be required. Not implemented due to absence.
}
