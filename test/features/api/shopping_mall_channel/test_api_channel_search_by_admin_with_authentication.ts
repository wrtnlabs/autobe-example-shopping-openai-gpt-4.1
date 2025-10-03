import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannel";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";

/**
 * Validate correct admin authentication and permission for channel search.
 *
 * This test ensures that:
 *
 * - A newly registered admin can authenticate successfully and obtain a valid
 *   session/token,
 * - Only authenticated admins can list shopping mall channels via PATCH
 *   /shoppingMall/admin/channels,
 * - The paginated channel result structure matches expectations (pagination info
 *   and channel list),
 * - Pagination and filter (search query, name) function as expected for channel
 *   listing,
 * - Unauthorized and unauthenticated access attempts are rejected.
 *
 * Steps:
 *
 * 1. Register a new admin (simulate onboarding, unique random email) with valid
 *    credentials.
 * 2. Assert that the returned token and authorized user object match
 *    IShoppingMallAdmin.IAuthorized.
 * 3. Use the authenticated connection to call shoppingMall.admin.channels.index
 *    with various filter/search parameters (including page/limit, search,
 *    name).
 * 4. Verify that the response meets the IPageIShoppingMallChannel.ISummary type
 *    and includes correct pagination info and non-empty channel data.
 * 5. Confirm that filtering by 'name' and 'search' returns matching or empty data
 *    as expected. (If possible, use random string to expect empty results.)
 * 6. Attempt to call the same endpoint with a new unauthenticated connection and
 *    confirm that access is denied (using TestValidator.error).
 */
export async function test_api_channel_search_by_admin_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register a new random admin for authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinBody });
  typia.assert(admin);

  // 2. Authenticated admin channel search - default (no filter)
  const defaultSearch = await api.functional.shoppingMall.admin.channels.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(defaultSearch);
  TestValidator.predicate(
    "pagination object exists on channel search result",
    typeof defaultSearch.pagination.current === "number" &&
      typeof defaultSearch.pagination.limit === "number" &&
      typeof defaultSearch.pagination.records === "number" &&
      typeof defaultSearch.pagination.pages === "number",
  );
  TestValidator.predicate(
    "channel array exists (may be empty)",
    Array.isArray(defaultSearch.data),
  );

  // 3. Search with pagination limit and custom page
  const pagedSearch = await api.functional.shoppingMall.admin.channels.index(
    connection,
    {
      body: {
        page: 1 as number,
        limit: 2 as number,
      },
    },
  );
  typia.assert(pagedSearch);
  TestValidator.equals(
    "pagination limit should equal requested",
    pagedSearch.pagination.limit,
    2,
  );
  TestValidator.equals(
    "pagination current page should equal requested",
    pagedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records >= data length",
    pagedSearch.pagination.records >= pagedSearch.data.length,
    true,
  );

  // 4. Search with random search query expecting empty result
  const impossibleQuery = RandomGenerator.alphabets(32);
  const searchResult = await api.functional.shoppingMall.admin.channels.index(
    connection,
    {
      body: {
        search: impossibleQuery,
      },
    },
  );
  typia.assert(searchResult);
  TestValidator.equals(
    "search with random string returns zero results",
    searchResult.data.length,
    0,
  );

  // 5. Unauthorized access - unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "channel listing should fail for unauthenticated user",
    async () => {
      await api.functional.shoppingMall.admin.channels.index(unauthConn, {
        body: {},
      });
    },
  );
}
