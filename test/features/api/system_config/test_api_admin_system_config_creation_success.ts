import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

export async function test_api_admin_system_config_creation_success(
  connection: api.IConnection,
) {
  /**
   * E2E test for admin system config creation (success scenario).
   *
   * - This test validates that a registered admin can create a global system
   *   configuration.
   * - Ensures proper authentication, unique key constraint, and field
   *   correctness.
   * - Step-by-step summary:
   *
   *   1. Register as a new admin (ensures fresh credentials and auth header)
   *   2. Create a new system configuration using valid data (unique key/value,
   *        description, timestamps)
   *   3. Assert output fields match input expectations and check additional audit
   *        fields
   */

  // Step 1: Register as admin
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const passwordHash = RandomGenerator.alphaNumeric(32); // Simulate hashed password
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@company.com`;
  const adminName = RandomGenerator.name();

  const adminJoinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: passwordHash,
      name: adminName,
      email: adminEmail,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoinResult);
  // Ensure token was issued and admin data matches
  TestValidator.equals(
    "admin username matches",
    adminJoinResult.admin.username,
    adminUsername,
  );
  TestValidator.equals(
    "admin email matches",
    adminJoinResult.admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "admin is_active set",
    adminJoinResult.admin.is_active,
    true,
  );

  // Step 2: Create a unique system config
  const configKey = `test_config_${RandomGenerator.alphaNumeric(10)}`;
  const configValue = RandomGenerator.alphaNumeric(24);
  const configDescription = RandomGenerator.paragraph({ sentences: 5 });
  const effectiveFrom = new Date().toISOString();
  const systemConfig =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: configKey,
          value: configValue,
          description: configDescription,
          effective_from: effectiveFrom,
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(systemConfig);

  // Step 3: Validate result matches expectations
  TestValidator.equals(
    "system config key matches",
    systemConfig.key,
    configKey,
  );
  TestValidator.equals(
    "system config value matches",
    systemConfig.value,
    configValue,
  );
  TestValidator.equals(
    "system config description matches",
    systemConfig.description,
    configDescription,
  );
  TestValidator.equals(
    "system config effective_from matches",
    systemConfig.effective_from,
    effectiveFrom,
  );
  TestValidator.equals(
    "system config effective_to is null",
    systemConfig.effective_to,
    null,
  );
  TestValidator.predicate(
    "system config id is uuid",
    typeof systemConfig.id === "string" && systemConfig.id.length > 10,
  );
  TestValidator.predicate(
    "system config created_at present",
    typeof systemConfig.created_at === "string" &&
      systemConfig.created_at.length > 0,
  );
  TestValidator.predicate(
    "system config updated_at present",
    typeof systemConfig.updated_at === "string" &&
      systemConfig.updated_at.length > 0,
  );
  TestValidator.equals(
    "system config deleted_at null",
    systemConfig.deleted_at,
    null,
  );
}
