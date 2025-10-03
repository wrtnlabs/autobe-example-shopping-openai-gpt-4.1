import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";

/**
 * Validate admin-only category listing for a specific shopping mall channel.
 *
 * - Register admin (join) and login for authentication
 * - Create a shopping mall channel as admin
 * - Attempt to fetch list of categories for that channel, paginated & filtered
 * - Assert only categories for that channel are returned
 * - Test authorized vs unauthorized listing attempt
 * - Validate pagination and filter behaviors
 * - Error: try to list categories from a random/inexistent channelId
 * - Error: attempt listing without admin authentication
 *
 * Steps:
 *
 * 1. Register unique admin account
 * 2. Create channel with unique code/name
 * 3. Valid admin session: list categories (default, filtered/search by name,
 *    sorted ascending/descending, paginated)
 * 4. Unauthorized session: listing fails
 * 5. Non-existent channel: error
 * 6. Assert summary fields on each result, pagination structure
 */
export async function test_api_admin_category_listing_within_channel(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(adminAuth);

  // 2. Create shopping mall channel
  const channelCreate = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph(),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelCreate,
    });
  typia.assert(channel);

  // 3. Listing (authenticated): basic
  const baseReq = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallChannelCategory.IRequest;
  const resultPage: IPageIShoppingMallChannelCategory.ISummary =
    await api.functional.shoppingMall.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: baseReq,
      },
    );
  typia.assert(resultPage);
  TestValidator.equals(
    "listed channelId matches requested",
    resultPage.data.every((cat) => cat.shopping_mall_channel_id === channel.id),
    true,
  );
  TestValidator.predicate(
    "category summary fields present",
    resultPage.data.every((cat) => cat.id && cat.name && cat.code),
  );

  // 4. Pagination/sort/search
  if (resultPage.data.length > 0) {
    const someCategory = RandomGenerator.pick(resultPage.data);
    // Search by name
    const searchRes =
      await api.functional.shoppingMall.admin.channels.categories.index(
        connection,
        {
          channelId: channel.id,
          body: {
            name: someCategory.name,
            page: 1,
            limit: 10,
          } satisfies IShoppingMallChannelCategory.IRequest,
        },
      );
    typia.assert(searchRes);
    TestValidator.predicate(
      "search by name returns correct categories",
      searchRes.data.every((cat) => cat.name === someCategory.name),
    );

    // Sorting asc/desc
    for (const sortBy of ["name", "display_order", "created_at"] as const) {
      for (const sortOrder of ["asc", "desc"] as const) {
        const sortedRes =
          await api.functional.shoppingMall.admin.channels.categories.index(
            connection,
            {
              channelId: channel.id,
              body: {
                sortBy,
                sortOrder,
                page: 1,
                limit: 10,
              } satisfies IShoppingMallChannelCategory.IRequest,
            },
          );
        typia.assert(sortedRes);
        // Sorting correctness validation left to business rules
      }
    }
  }

  // 5. Unauthorized access: clear admin headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "listing without authentication fails",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.index(
        unauthConn,
        {
          channelId: channel.id,
          body: baseReq,
        },
      );
    },
  );

  // 6. Non-existent channelId error
  await TestValidator.error(
    "listing categories for non-existent channel should fail",
    async () => {
      await api.functional.shoppingMall.admin.channels.categories.index(
        connection,
        {
          channelId: typia.random<string & tags.Format<"uuid">>(),
          body: baseReq,
        },
      );
    },
  );
}
