import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validate admin creation of new configurations and enforcement of config key
 * uniqueness and admin-only access.
 *
 * 1. Register an admin and obtain authorization
 * 2. Create a new configuration using all required fields for shopping mall
 *    configuration
 * 3. Assert the configuration is created with retrievable values and expected
 *    revision
 * 4. Attempt duplicate configuration creation (should fail on duplicate key)
 * 5. Attempt creation as an unauthorized user (should be rejected)
 */
export async function test_api_configuration_creation_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin and obtain authorization
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(10);
  const adminName: string = RandomGenerator.name();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(authorizedAdmin);

  // Step 2: Create a new configuration with all required fields
  const configKey = "config_" + RandomGenerator.alphaNumeric(8);
  const configValue = JSON.stringify({
    feature: true,
    message: RandomGenerator.paragraph(),
  });
  const configRevision = 1 as number & tags.Type<"int32">;
  const configDescription = RandomGenerator.paragraph({ sentences: 5 });

  const configInput = {
    key: configKey,
    value: configValue,
    revision: configRevision,
    description: configDescription,
  } satisfies IShoppingMallConfiguration.ICreate;

  const createdConfig: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.create(connection, {
      body: configInput,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "configuration key matches",
    createdConfig.key,
    configKey,
  );
  TestValidator.equals(
    "configuration value matches",
    createdConfig.value,
    configValue,
  );

  // Step 3: Assert configuration is retrievable (should match input)
  // (No GET endpoint in function list, so skip direct retrieval and assert on creation result)

  // Step 4: Attempt duplicate configuration creation - should fail
  await TestValidator.error(
    "duplicate configuration key should fail",
    async () => {
      await api.functional.shoppingMall.admin.configurations.create(
        connection,
        {
          body: configInput,
        },
      );
    },
  );

  // Step 5: Attempt config creation as unauthorized user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized user config creation should fail",
    async () => {
      await api.functional.shoppingMall.admin.configurations.create(
        unauthConn,
        {
          body: {
            key: "unauth_config_" + RandomGenerator.alphaNumeric(8),
            value: "value",
            revision: 1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallConfiguration.ICreate,
        },
      );
    },
  );
}
