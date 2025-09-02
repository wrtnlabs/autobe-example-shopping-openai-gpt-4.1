import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_detail_retrieval(
  connection: api.IConnection,
) {
  /**
   * E2E: Retrieve detailed admin system config by configId.
   *
   * 1. Register a new admin to get authentication.
   * 2. Create a new system configuration (random key/value/content) as admin.
   * 3. Retrieve system config detail using GET endpoint.
   *
   *    - Validate all returned fields match the original creation input where
   *         applicable.
   *    - Confirm system-generated fields (created_at, updated_at, id, etc) are
   *         populated and well-formed.
   * 4. Attempt to retrieve a config by random non-existent configId and confirm
   *    error is returned.
   */

  // 1. Register a new admin (for authentication)
  const adminInput: IShoppingMallAiBackendAdmin.ICreate = {
    username: RandomGenerator.alphaNumeric(8),
    password_hash: RandomGenerator.alphaNumeric(32),
    name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    is_active: true,
  };
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(adminAuth);
  TestValidator.equals(
    "admin account email matches",
    adminAuth.admin.email,
    adminInput.email,
  );
  TestValidator.equals(
    "admin account is_active matches",
    adminAuth.admin.is_active,
    adminInput.is_active,
  );

  // 2. Create a new system config entry
  const configInput: IShoppingMallAiBackendSystemConfig.ICreate = {
    key: `test_key_${RandomGenerator.alphaNumeric(8)}`,
    value: JSON.stringify({
      featureFlag: true,
      rollout: RandomGenerator.alphaNumeric(5),
    }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    effective_from: new Date().toISOString(),
    effective_to: null,
  };
  const createdConfig =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: configInput,
      },
    );
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config key matches input",
    createdConfig.key,
    configInput.key,
  );
  TestValidator.equals(
    "created config value matches input",
    createdConfig.value,
    configInput.value,
  );
  TestValidator.equals(
    "created config description matches input",
    createdConfig.description,
    configInput.description,
  );
  TestValidator.equals(
    "created config effective_from matches input",
    createdConfig.effective_from,
    configInput.effective_from,
  );
  TestValidator.equals(
    "created config effective_to matches input",
    createdConfig.effective_to,
    configInput.effective_to,
  );
  TestValidator.predicate(
    "created config id is present",
    typeof createdConfig.id === "string" && createdConfig.id.length > 10,
  );
  TestValidator.predicate(
    "created config created_at is present",
    typeof createdConfig.created_at === "string" &&
      createdConfig.created_at.length > 10,
  );
  TestValidator.predicate(
    "created config updated_at is present",
    typeof createdConfig.updated_at === "string" &&
      createdConfig.updated_at.length > 10,
  );

  // 3. Retrieve the config detail by configId
  const gotConfig =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.at(
      connection,
      {
        configId: createdConfig.id,
      },
    );
  typia.assert(gotConfig);
  TestValidator.equals(
    "retrieved config id matches",
    gotConfig.id,
    createdConfig.id,
  );
  TestValidator.equals(
    "retrieved config key matches",
    gotConfig.key,
    configInput.key,
  );
  TestValidator.equals(
    "retrieved config value matches",
    gotConfig.value,
    configInput.value,
  );
  TestValidator.equals(
    "retrieved config description matches",
    gotConfig.description,
    configInput.description,
  );
  TestValidator.equals(
    "retrieved config effective_from matches",
    gotConfig.effective_from,
    configInput.effective_from,
  );
  TestValidator.equals(
    "retrieved config effective_to matches",
    gotConfig.effective_to,
    configInput.effective_to,
  );
  TestValidator.predicate(
    "retrieved config has created_at",
    typeof gotConfig.created_at === "string" &&
      gotConfig.created_at.length > 10,
  );
  TestValidator.predicate(
    "retrieved config has updated_at",
    typeof gotConfig.updated_at === "string" &&
      gotConfig.updated_at.length > 10,
  );

  // 4. Error case: Try to retrieve non-existent configId
  await TestValidator.error(
    "retrieving non-existent configId returns error",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.at(
        connection,
        {
          configId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
