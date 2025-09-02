import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSystemConfig";
import type { IPageIShoppingMallAiBackendSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendSystemConfig";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_admin_system_config_search_invalid_filter_error(
  connection: api.IConnection,
) {
  /**
   * Validates error handling for admin systemConfigs search with invalid
   * filters.
   *
   * 1. Register a new admin and perform authentication via /auth/admin/join. This
   *    provides 'admin' context and is required for all further requests.
   * 2. Search with invalid property in filter (not in schema) - should trigger
   *    validation error.
   * 3. Search with known filter key but value that cannot be matched (e.g. random
   *    nonsense) - should succeed, but results should be empty (no config
   *    matches).
   * 4. Search with page number set extremely high (absurdly out of bounds) -
   *    should succeed but return empty result list, and pagination reflects
   *    state.
   * 5. (Optional) Search with completely malformed body (object not matching
   *    schema at all) - must fail with validation error.
   * 6. For each error case, use await TestValidator.error with descriptive title.
   *    For valid-but-empty result, use TestValidator.equals to assert empty
   *    data array.
   */

  // 1. Register and authenticate admin
  const adminRegistration = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: `${RandomGenerator.alphabets(8)}@example.com`,
      phone_number: null,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegistration);

  // 2. Submit request with a non-existent property (should error)
  await TestValidator.error(
    "systemConfigs.search fails for non-schema filter property",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: {
            notarealfield: "BOGUS-FIELD",
          } as any, // purposely invalid body (not in schema)
        },
      );
    },
  );

  // 3. Search for config with unmatchable key (absurd value)
  const resImpossibleKey =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
      connection,
      {
        body: {
          key: RandomGenerator.alphaNumeric(16),
        } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
      },
    );
  typia.assert(resImpossibleKey);
  TestValidator.equals(
    "systemConfigs.search with impossible key returns empty result",
    resImpossibleKey.data,
    [],
  );

  // 4. Search for out-of-bounds page (should be valid but empty)
  const resOobPage =
    await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
      connection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IShoppingMallAiBackendSystemConfig.IRequest,
      },
    );
  typia.assert(resOobPage);
  TestValidator.equals(
    "systemConfigs.search out-of-bounds page returns empty data",
    resOobPage.data,
    [],
  );

  // 5. Submit completely malformed body (should error)
  await TestValidator.error(
    "systemConfigs.search fails for malformed input",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.systemConfigs.index(
        connection,
        {
          body: 42 as any, // not even an object
        },
      );
    },
  );
}
