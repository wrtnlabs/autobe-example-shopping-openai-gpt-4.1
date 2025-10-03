import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validate administrator can retrieve configuration detail by ID, and all
 * failure/edge cases for access.
 *
 * 1. Register a new admin (join) to obtain a privileged, authorized session.
 * 2. Create a new configuration record with randomized values using the admin
 *    context.
 * 3. Retrieve the configuration by its generated ID as the same authenticated
 *    admin; verify all properties match, including revision, channel
 *    association, and audit fields.
 * 4. Attempt to retrieve the configuration using an unauthenticated session (blank
 *    headers) and expect error.
 * 5. Attempt to retrieve a completely non-existent configurationId and expect
 *    error.
 * 6. (If possible, test with soft-deleted configuration; omitted here due to lack
 *    of delete API).
 */
export async function test_api_configuration_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);
  // Auth token now set in connection

  // 2. Create a new configuration
  const confBody = {
    shopping_mall_channel_id: null, // test global (no channel) config; could randomize
    key: RandomGenerator.alphaNumeric(12),
    value: RandomGenerator.content({ paragraphs: 3 }),
    revision: 1,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallConfiguration.ICreate;
  const created = await api.functional.shoppingMall.admin.configurations.create(
    connection,
    { body: confBody },
  );
  typia.assert(created);

  // 3. Retrieve the configuration by ID
  const got = await api.functional.shoppingMall.admin.configurations.at(
    connection,
    {
      configurationId: created.id,
    },
  );
  typia.assert(got);

  // 4. Assert all properties match create record (besides audit fields)
  // Full property coverage - all fields present and as expected
  TestValidator.equals("configuration: id matches", got.id, created.id);
  TestValidator.equals("configuration: key matches", got.key, confBody.key);
  TestValidator.equals(
    "configuration: value matches",
    got.value,
    confBody.value,
  );
  TestValidator.equals(
    "configuration: revision matches",
    got.revision,
    confBody.revision,
  );
  TestValidator.equals(
    "configuration: description matches",
    got.description,
    confBody.description,
  );
  TestValidator.equals(
    "configuration: channel association matches",
    got.shopping_mall_channel_id,
    confBody.shopping_mall_channel_id,
  );
  // Audit fields (created_at/updated_at) present and valid string date-time
  TestValidator.predicate(
    "created_at is date-time",
    typeof got.created_at === "string" && !!got.created_at,
  );
  TestValidator.predicate(
    "updated_at is date-time",
    typeof got.updated_at === "string" && !!got.updated_at,
  );
  TestValidator.equals(
    "deleted_at should be null or undefined on creation",
    got.deleted_at,
    null,
  );

  // 5. Attempt retrieval without authentication (expect error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated config detail retrieval fails",
    async () => {
      await api.functional.shoppingMall.admin.configurations.at(unauthConn, {
        configurationId: created.id,
      });
    },
  );

  // 6. Attempt retrieval with non-existent configId (expect error)
  await TestValidator.error(
    "retrieval with random/nonexistent configId fails",
    async () => {
      await api.functional.shoppingMall.admin.configurations.at(connection, {
        configurationId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
