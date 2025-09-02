import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_creation_duplicate_key_error(
  connection: api.IConnection,
) {
  /**
   * Validates that the system config API enforces unique key constraints:
   *
   * 1. Register a new admin and establish authentication
   * 2. Create a system config entry with a random, unique key
   * 3. Attempt to create another config entry with the exact same key, expecting a
   *    constraint error
   * 4. (Optional) Verify data consistency – direct verification (indexing/listing)
   *    is not possible due to SDK limitations
   *
   * This test ensures that backend safely prohibits creation of duplicate
   * configuration keys, a critical requirement for reliable global platform
   * setup and policy enforcement.
   */

  // 1. Register and authenticate as admin
  const adminUsername = RandomGenerator.name().replace(/\s+/g, "_");
  const adminEmail = `${RandomGenerator.alphabets(10)}@company.com`;
  const passwordHash = RandomGenerator.alphaNumeric(32); // Placeholder hash, must be securely hashed in production context
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: RandomGenerator.name(),
      email: adminEmail,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a unique system config
  const testKey = RandomGenerator.alphaNumeric(8);
  const config1 =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: testKey,
          value: "first-value",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          effective_from: null,
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(config1);
  TestValidator.equals("system config key equals input", config1.key, testKey);
  TestValidator.equals(
    "system config value equals input",
    config1.value,
    "first-value",
  );

  // 3. Attempt duplicate key creation – should fail with business rule error
  await TestValidator.error(
    "attempting to create a duplicate system config key fails",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
        connection,
        {
          body: {
            key: testKey,
            value: "second-value",
            description: RandomGenerator.paragraph({ sentences: 3 }),
            effective_from: null,
            effective_to: null,
          } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
        },
      );
    },
  );
}
