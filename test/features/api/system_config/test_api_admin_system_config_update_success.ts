import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

/**
 * Test successful update of a global system configuration by an
 * authenticated admin.
 *
 * 1. Register a new admin account using the admin join operation to establish
 *    authentication.
 * 2. Create a new system configuration entry to obtain a configId for later
 *    update.
 * 3. (Optional) Re-authenticate as the admin if required (token is set
 *    automatically after registration).
 * 4. Invoke the update endpoint for the created configId, updating fields such
 *    as value, description, or effective_from.
 * 5. Verify the response reflects updated fields, and that updated_at is more
 *    recent than before.
 */
export async function test_api_admin_system_config_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin account.
  const adminReg = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(40),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@test.local`,
      phone_number: RandomGenerator.mobile(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminReg);

  // 2. Create a new system config entry.
  const initialConfig =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphaNumeric(16),
          value: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          effective_from: new Date().toISOString(),
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(initialConfig);

  // Save the original updated_at for comparison.
  const originalUpdatedAt = initialConfig.updated_at;

  // 3. (No explicit re-authentication needed, already admin)

  // 4. Issue update to value, description, and effective_from.
  const newValue = RandomGenerator.paragraph({ sentences: 3 });
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const newEffectiveFrom = new Date(
    Date.now() + 24 * 3600 * 1000,
  ).toISOString(); // 1 day in future
  const updateResult =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.update(
      connection,
      {
        configId: initialConfig.id,
        body: {
          value: newValue,
          description: newDescription,
          effective_from: newEffectiveFrom,
          // Leave other fields undefined (partial update)
        } satisfies IShoppingMallAiBackendSystemConfig.IUpdate,
      },
    );
  typia.assert(updateResult);

  // 5. Verify updated fields and audit timestamp
  TestValidator.equals(
    "system config id remains constant",
    updateResult.id,
    initialConfig.id,
  );
  TestValidator.notEquals(
    "value has changed",
    updateResult.value,
    initialConfig.value,
  );
  TestValidator.equals("updated value persisted", updateResult.value, newValue);
  TestValidator.notEquals(
    "description has changed",
    updateResult.description,
    initialConfig.description,
  );
  TestValidator.equals(
    "updated description persisted",
    updateResult.description,
    newDescription,
  );
  TestValidator.equals(
    "updated effective_from persisted",
    updateResult.effective_from,
    newEffectiveFrom,
  );
  TestValidator.notEquals(
    "updated_at is updated",
    updateResult.updated_at,
    originalUpdatedAt,
  );
}
