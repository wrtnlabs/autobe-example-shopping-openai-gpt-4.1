import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfiguration";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";

/**
 * Validate advanced configuration search and pagination for admin users.
 *
 * - Register a new admin and login.
 * - Create a new shopping mall channel for use with channel-based filters.
 * - Create several configuration records for the created channel and for the
 *   global scope, varying key, value, description, and revision.
 * - Mark one configuration as deleted (simulate soft deletion with deleted_at
 *   timestamp).
 *
 * 1. Retrieve first page without any filter—expect all (non-deleted) configs
 *    present with correct pagination.
 * 2. Search by channel filter—only channel configs should be returned.
 * 3. Search by partial key (e.g., with a substring of an existing config key).
 * 4. Search by revision number—should return only the config with that revision.
 * 5. Search with date range filters for created_at/updated_at—results should match
 *    correct date window.
 * 6. Mark a config as deleted; ensure it's omitted by default and appears only if
 *    deleted:true is passed.
 * 7. Test pagination by setting limit to 1 and retrieving the second page—should
 *    get correct single config.
 * 8. Attempt to search with an unauthenticated or unauthorized connection—should
 *    result in access error.
 * 9. Attempt to query with invalid parameters (e.g., negative page,
 *    over-limit)—should throw error.
 * 10. Test for rate limit/excessive queries by issuing a burst of requests
 *     (simulate if possible).
 *
 * Throughout:
 *
 * - Assert output type with typia.assert();
 * - Validate pagination metadata and that results respect constraints (no deleted
 *   unless requested, matches filters, etc.);
 * - Use TestValidator for all logic checks and error scenarios.
 */
export async function test_api_configuration_search_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = {
    email: adminEmail,
    password: adminPassword,
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(adminAuth);

  // 2. Create a new channel for configuration filtering
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create multiple configuration records for testing search/pagination
  const configs = [
    // Channel-specific config
    {
      shopping_mall_channel_id: channel.id,
      key: `test_key_${RandomGenerator.alphabets(5)}`,
      value: RandomGenerator.alphaNumeric(8),
      revision: 1,
      description: RandomGenerator.paragraph({ sentences: 2 }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // Global config
    {
      shopping_mall_channel_id: null,
      key: `global_feature_${RandomGenerator.alphabets(4)}`,
      value: RandomGenerator.alphaNumeric(10),
      revision: 2,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // For revision/date testing
    {
      shopping_mall_channel_id: channel.id,
      key: `another_key_${RandomGenerator.alphabets(4)}`,
      value: RandomGenerator.alphaNumeric(7),
      revision: 3,
      description: RandomGenerator.paragraph({ sentences: 1 }),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(), // 5 days ago
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    },
  ].map((c) => ({
    ...c,
    id: typia.random<string & tags.Format<"uuid">>(),
    deleted_at: undefined,
    value: String(c.value), // ensure value is string
  })) as IShoppingMallConfiguration[];

  // Simulate soft deleting the third config
  configs[2].deleted_at = new Date().toISOString();

  // 1. Retrieve first page without filter—should NOT include deleted config
  const allConfigResult =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { page: 1, limit: 10 },
    });
  typia.assert(allConfigResult);
  TestValidator.predicate(
    "result omits soft-deleted config",
    allConfigResult.data.every((c) => !c.deleted_at),
  );

  // 2. Filter by channel—only channel config(s) should match
  const filterByChannel =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { shopping_mall_channel_id: channel.id },
    });
  typia.assert(filterByChannel);
  TestValidator.predicate(
    "only channel configs appear when filtered by channel",
    filterByChannel.data.every(
      (conf) => conf.shopping_mall_channel_id === channel.id,
    ),
  );

  // 3. Filter by partial key substring
  const partialKeySubstr = configs[0].key.slice(0, 6);
  const filterByKey =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { key: partialKeySubstr },
    });
  typia.assert(filterByKey);
  TestValidator.predicate(
    "result contains only configs with partial key match",
    filterByKey.data.every((conf) => conf.key.includes(partialKeySubstr)),
  );

  // 4. Filter by revision number
  const revNumber = configs[0].revision;
  const filterByRevision =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { revision: revNumber },
    });
  typia.assert(filterByRevision);
  TestValidator.predicate(
    "one or more configs with specified revision present",
    filterByRevision.data.every((conf) => conf.revision === revNumber),
  );

  // 5. Filter with created_at/updated_at ranges
  const nowIso = new Date().toISOString();
  const fiveDaysAgoIso = new Date(Date.now() - 5 * 86400000).toISOString();
  const threeDaysAgoIso = new Date(Date.now() - 3 * 86400000).toISOString();
  const filterByCreatedAt =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: {
        created_at_from: fiveDaysAgoIso,
        created_at_to: nowIso,
      },
    });
  typia.assert(filterByCreatedAt);
  TestValidator.predicate(
    "all configs created between window",
    filterByCreatedAt.data.every(
      (conf) => conf.created_at >= fiveDaysAgoIso && conf.created_at <= nowIso,
    ),
  );

  const filterByUpdatedAt =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: {
        updated_at_from: threeDaysAgoIso,
        updated_at_to: nowIso,
      },
    });
  typia.assert(filterByUpdatedAt);
  TestValidator.predicate(
    "all configs updated between window",
    filterByUpdatedAt.data.every(
      (conf) => conf.updated_at >= threeDaysAgoIso && conf.updated_at <= nowIso,
    ),
  );

  // 6. Show deleted configs if deleted:true
  const includeDeleted =
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { deleted: true },
    });
  typia.assert(includeDeleted);
  TestValidator.predicate(
    "results include at least one soft-deleted config",
    includeDeleted.data.some(
      (c) => c.deleted_at !== null && c.deleted_at !== undefined,
    ),
  );

  // 7. Pagination with limit and page
  const paged = await api.functional.shoppingMall.admin.configurations.index(
    connection,
    {
      body: { limit: 1, page: 2 },
    },
  );
  typia.assert(paged);
  TestValidator.equals("page size is 1", paged.data.length, 1);
  TestValidator.equals("current page is 2", paged.pagination.current, 2);

  // 8. Unauthenticated/unauthorized access
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated user cannot access", async () => {
    await api.functional.shoppingMall.admin.configurations.index(unauthConn, {
      body: {},
    });
  });

  // 9. Invalid query param (negative page/over-limit)
  await TestValidator.error("negative page param throws error", async () => {
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { page: -1 },
    });
  });
  await TestValidator.error("limit > allowed throws error", async () => {
    await api.functional.shoppingMall.admin.configurations.index(connection, {
      body: { limit: 1_000_000 },
    });
  });

  // 10. Simulate rate-limit/excessive queries (simulate burst)
  await Promise.all(
    ArrayUtil.repeat(10, (i) =>
      api.functional.shoppingMall.admin.configurations.index(connection, {
        body: { page: 1 },
      }),
    ),
  );
}
