import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";

/**
 * Test that unauthorized update of a system configuration fails as required
 * by business logic.
 *
 * This test verifies that updating a system configuration via the admin API
 * without an established admin session is strictly prohibited. The test
 * proceeds by:
 *
 * 1. Creating an admin account and authenticating it.
 * 2. Creating a system config using the admin session (acquiring configId and
 *    initial snapshot).
 * 3. Simulating a fully unauthorized session (connection without Authorization
 *    header).
 * 4. Attempting to update the config using the unauthorized session: expects
 *    the API to reject with an authorization error.
 * 5. Asserts that the configuration remains unmodified after the denied update
 *    attempt by retrieving and comparing the latest value where possible
 *    (this API set does not expose project config read endpoints, so
 *    assertion is limited to update failure rather than value
 *    verification).
 */
export async function test_api_admin_system_config_update_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(64),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphaNumeric(8)}@admin-test.com`,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a system config as admin
  const configCreate =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
      connection,
      {
        body: {
          key: RandomGenerator.alphaNumeric(12),
          value: RandomGenerator.alphaNumeric(20),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          effective_from: null,
          effective_to: null,
        } satisfies IShoppingMallAiBackendSystemConfig.ICreate,
      },
    );
  typia.assert(configCreate);
  const configId = typia.assert(configCreate.id);

  // 3. Prepare unauthorized connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to update the system config using unauthenticated connection
  await TestValidator.error(
    "unauthorized update must be rejected",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.update(
        unauthConn,
        {
          configId,
          body: {
            value: RandomGenerator.alphaNumeric(30),
          } satisfies IShoppingMallAiBackendSystemConfig.IUpdate,
        },
      );
    },
  );

  // 5. (Optional) Could verify the config remains unchanged if a 'get' endpoint existed. Currently, limited to asserting error.
}
