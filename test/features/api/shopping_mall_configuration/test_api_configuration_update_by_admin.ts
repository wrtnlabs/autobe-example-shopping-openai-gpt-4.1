import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validate admin configuration update API including happy path and error
 * scenarios.
 *
 * 1. Register (join) as a new admin (acquire credentials)
 * 2. Create a configuration record (with key, value, revision=1, optional
 *    description)
 * 3. Update value, key, description fields (test partial and full updates)
 * 4. Validate revision is incremented (if handled at business logic), updated
 *    fields are reflected, and correct returned payload
 * 5. Attempt unauthenticated update (simulate by empty headers) and expect error
 * 6. Attempt to update a non-existent configuration, expect error
 */
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register as new admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. Create configuration (admin, so connection is authenticated)
  const configCreateBody = {
    key: "feature_test" + RandomGenerator.alphaNumeric(6),
    value: RandomGenerator.alphabets(12),
    revision: 1 as number & tags.Type<"int32">,
    description: "Initial config for e2e test",
  } satisfies IShoppingMallConfiguration.ICreate;
  const createdConfig =
    await api.functional.shoppingMall.admin.configurations.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);
  TestValidator.equals(
    "created config revision",
    createdConfig.revision,
    configCreateBody.revision,
  );
  TestValidator.equals(
    "created config key",
    createdConfig.key,
    configCreateBody.key,
  );
  TestValidator.equals(
    "created config value",
    createdConfig.value,
    configCreateBody.value,
  );
  TestValidator.equals(
    "created config description",
    createdConfig.description,
    configCreateBody.description,
  );

  // 3. Update config value and description
  const updateBody1 = {
    value: RandomGenerator.alphabets(16),
    description: "[edited] updated value and desc",
  } satisfies IShoppingMallConfiguration.IUpdate;
  const updatedConfig1 =
    await api.functional.shoppingMall.admin.configurations.update(connection, {
      configurationId: createdConfig.id,
      body: updateBody1,
    });
  typia.assert(updatedConfig1);
  TestValidator.equals("update value", updatedConfig1.value, updateBody1.value);
  TestValidator.equals(
    "update desc",
    updatedConfig1.description,
    updateBody1.description,
  );
  TestValidator.predicate(
    "revision increased",
    updatedConfig1.revision > createdConfig.revision,
  );
  TestValidator.predicate(
    "updated_at changes after update",
    updatedConfig1.updated_at > createdConfig.updated_at,
  );

  // 4. Update key only
  const newKey = "editedKey" + RandomGenerator.alphaNumeric(4);
  const updateBody2 = {
    key: newKey,
  } satisfies IShoppingMallConfiguration.IUpdate;
  const updatedConfig2 =
    await api.functional.shoppingMall.admin.configurations.update(connection, {
      configurationId: createdConfig.id,
      body: updateBody2,
    });
  typia.assert(updatedConfig2);
  TestValidator.equals("update key", updatedConfig2.key, newKey);
  TestValidator.equals(
    "keep value",
    updatedConfig2.value,
    updatedConfig1.value,
  );
  TestValidator.equals(
    "keep desc",
    updatedConfig2.description,
    updatedConfig1.description,
  );
  TestValidator.equals(
    "revision increases again",
    updatedConfig2.revision,
    updatedConfig1.revision + 1,
  );
  TestValidator.predicate(
    "updated_at forward",
    updatedConfig2.updated_at > updatedConfig1.updated_at,
  );

  // 5. Unauthorized update attempt (simulate unauth connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update fails", async () => {
    await api.functional.shoppingMall.admin.configurations.update(unauthConn, {
      configurationId: createdConfig.id,
      body: { value: "fail-should-not-change" },
    });
  });

  // 6. Attempt update with wrong (non-existing) configurationId
  const nonExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "update fails for unknown configurationId",
    async () => {
      await api.functional.shoppingMall.admin.configurations.update(
        connection,
        {
          configurationId: nonExistId,
          body: { value: "fail-should-not-change" },
        },
      );
    },
  );
}
