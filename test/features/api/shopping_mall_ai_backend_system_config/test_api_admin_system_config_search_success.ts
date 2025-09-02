import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import type { IPageIShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for admin system configuration search and pagination.
 *
 * Validates that an authenticated admin can search, paginate, and retrieve
 * global system configurations using advanced filtering (by key,
 * description, date ranges, paging parameters, sorting, and more). Ensures
 * configs are returned excluding soft-deleted by default, includes proper
 * pagination metadata, and that business logic for searching and listing
 * configs is enforced.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin
 * 2. Create multiple sample system config entries with different keys,
 *    descriptions, and date ranges
 * 3. Perform advanced searches: by key, description substring, created_at
 *    range, paging and sorting
 * 4. Validate soft-delete exclusion (deleted_at is null in all results by
 *    default)
 * 5. Test negative and boundary scenarios (impossible description, oversize
 *    page)
 */
export async function test_api_admin_system_config_search_success(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminUsername = RandomGenerator.alphabets(10);
  const adminEmail = `${RandomGenerator.alphabets(6)}@testmalladmin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminName = RandomGenerator.name();
  const adminPhone = RandomGenerator.mobile();
  const joinResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminName,
      email: adminEmail,
      phone_number: adminPhone,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(joinResult);
  TestValidator.equals(
    "joined admin's email correct",
    joinResult.admin.email,
    adminEmail,
  );
  TestValidator.equals(
    "joined admin is active",
    joinResult.admin.is_active,
    true,
  );

  // 2. Create sample system configurations
  const baseKey = `feature_toggle_${RandomGenerator.alphaNumeric(5)}`;
  const configsToCreate = [
    {
      key: `${baseKey}_A`,
      value: JSON.stringify({ enabled: true, maxLimit: 5 }),
      description: "Enable feature A",
      effective_from: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      effective_to: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
    },
    {
      key: `${baseKey}_B`,
      value: JSON.stringify({ enabled: false }),
      description: "Disable feature B",
      effective_from: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      effective_to: null,
    },
    {
      key: `${baseKey}_C`,
      value: JSON.stringify({ value: 42 }),
      description: "Config C for test",
      effective_from: null,
      effective_to: null,
    },
  ];
  const createdConfigs: IShoppingMallAiBackendSystemConfig[] = [];
  for (const createDto of configsToCreate) {
    const created =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.create(
        connection,
        {
          body: createDto satisfies IShoppingMallAiBackendSystemConfig.ICreate,
        },
      );
    typia.assert(created);
    createdConfigs.push(created);
  }

  // 3. Advanced search scenarios and validation
  // --- Exact search by key ---
  {
    const key = createdConfigs[0].key;
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: { key } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.predicate(
      "search by key finds at least one",
      response.data.length > 0,
    );
    const found = response.data.find((conf) => conf.key === key);
    TestValidator.predicate(
      "matching config returned in key search",
      found !== undefined,
    );
    TestValidator.equals("config key matches", found!.key, key);
  }

  // --- Description substring (partial match) ---
  {
    const descriptionSample = RandomGenerator.substring(
      createdConfigs[1].description!,
    );
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            description: descriptionSample,
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    for (const conf of response.data) {
      TestValidator.predicate(
        "description substring appears in each result",
        conf.description !== null &&
          conf.description !== undefined &&
          conf.description.includes(descriptionSample),
      );
    }
  }

  // --- Pagination & partial listing: limit = 2, page 1 ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            limit: 2,
            page: 1,
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals("pagination.limit is 2", response.pagination.limit, 2);
    TestValidator.equals(
      "pagination.current page is 1",
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      "pagination data at most 2 configs",
      response.data.length <= 2,
    );
  }

  // --- Pagination page 2 (may result in 0 or 1 configs if 3 test configs created) ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            limit: 2,
            page: 2,
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "pagination.limit page2 is 2",
      response.pagination.limit,
      2,
    );
    TestValidator.equals(
      "pagination.current page page2 is 2",
      response.pagination.current,
      2,
    );
    TestValidator.predicate(
      "pagination page 2 data is valid length",
      response.data.length <= 2,
    );
  }

  // --- Search by created_at range ---
  {
    const target = createdConfigs[2];
    const from = new Date(
      new Date(target.created_at).getTime() - 1,
    ).toISOString();
    const to = new Date(
      new Date(target.created_at).getTime() + 1,
    ).toISOString();
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            created_at_from: from,
            created_at_to: to,
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    const found = response.data.find((conf) => conf.id === target.id);
    TestValidator.predicate(
      "created_at range covers config",
      found !== undefined,
    );
  }

  // --- Sort by key ascending ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            sort_by: "key",
            order: "asc",
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    const keys = response.data.map((c) => c.key);
    const sorted = [...keys].sort();
    TestValidator.equals("asc sort by key", keys, sorted);
  }

  // --- Soft-deleted exclusion: all deleted_at must be null by default ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {} satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    for (const conf of response.data) {
      TestValidator.equals(
        "deleted_at must be null by default",
        conf.deleted_at,
        null,
      );
    }
  }

  // --- Negative search: non-existent description ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            description: "ThisShouldNotExistInAnyConfig",
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "no config returned for non-existing description",
      response.data.length,
      0,
    );
  }

  // --- Edge: page number far beyond available returns empty data ---
  {
    const response =
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            page: 100,
            limit: 1,
          } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
        },
      );
    typia.assert(response);
    TestValidator.equals(
      "no results returned for oversize page number",
      response.data.length,
      0,
    );
  }
}
