import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleCategory";
import type { IPageIShoppingMallAiBackendArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for admin search/filter of article categories with pagination
 * and sorting.
 *
 * 1. Register as a new admin (random unique credentials).
 * 2. Retrieve article category list (default, no filter).
 * 3. Search by partial name (uses substring of a real category or random
 *    string).
 * 4. Filter by parent_id (if data available).
 * 5. Filter by channel_id (if data available).
 * 6. Sort by order DESC, ensure descending.
 * 7. Pagination with large page number (expect empty data).
 * 8. Edge cases for limit (0, -1, 1000), ensure response shape. For each call:
 *    Validate DTO structure (typia.assert), pagination fields, filter/sort
 *    logic, array properties.
 */
export async function test_api_article_category_search_success(
  connection: api.IConnection,
) {
  // 1. Register a new admin with random, unique credentials
  const adminResult = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminResult);
  const admin = adminResult.admin;

  // 2. Retrieve category list with default/no filter
  const defaultPage =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
      connection,
      {
        body: {} satisfies IShoppingMallAiBackendArticleCategory.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "Default page has valid pagination",
    typeof defaultPage.pagination.current === "number" &&
      defaultPage.pagination.current > 0,
  );
  TestValidator.predicate(
    "Default page data is array",
    Array.isArray(defaultPage.data),
  );

  // Prepare for targeted filters: get example category attributes
  const hasData = defaultPage.data.length > 0;
  let categoryName: string | undefined = undefined,
    parentId: string | undefined = undefined,
    channelId: string | undefined = undefined;
  if (hasData) {
    const pick = defaultPage.data[0];
    categoryName = pick.name;
    parentId = (pick as any).parent_id ?? undefined; // parent_id is used in filter request
    channelId = pick.channel_id;
  }

  // 3. Search by partial name or random string
  const searchQuery = categoryName
    ? RandomGenerator.substring(categoryName)
    : RandomGenerator.alphaNumeric(8);
  const searchPage =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
      connection,
      {
        body: {
          q: searchQuery,
        } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
      },
    );
  typia.assert(searchPage);
  if (searchPage.data.length > 0) {
    for (const c of searchPage.data)
      TestValidator.predicate(
        "Search result matches 'q'",
        c.name.includes(searchQuery),
      );
  } else {
    TestValidator.equals(
      "No matches for random/unmatched search query",
      searchPage.data.length,
      0,
    );
  }

  // 4. Filter by parent_id, if available
  if (parentId) {
    const byParent =
      await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
        connection,
        {
          body: {
            parent_id: parentId,
          } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
        },
      );
    typia.assert(byParent);
    for (const c of byParent.data)
      TestValidator.equals(
        "parent_id filter matched",
        (c as any).parent_id,
        parentId,
      );
  }

  // 5. Filter by channel_id, if available
  if (channelId) {
    const byChannel =
      await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
        connection,
        {
          body: {
            channel_id: channelId,
          } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
        },
      );
    typia.assert(byChannel);
    for (const c of byChannel.data)
      TestValidator.equals(
        "channel_id filter matched",
        c.channel_id,
        channelId,
      );
  }

  // 6. Sort by order DESC
  const descPage =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
      connection,
      {
        body: {
          sort: "-order",
        } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
      },
    );
  typia.assert(descPage);
  if (descPage.data.length > 1) {
    for (let i = 1; i < descPage.data.length; ++i)
      TestValidator.predicate(
        "Order is descending",
        descPage.data[i - 1].order >= descPage.data[i].order,
      );
  }

  // 7. Edge: huge page number
  const emptyPage =
    await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
      connection,
      {
        body: {
          page: 1000000,
        } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("Big page returns empty data", emptyPage.data.length, 0);

  // 8. Edge: limit = 0, -1, 1000
  for (const limit of [0, -1, 1000]) {
    const edgePage =
      await api.functional.shoppingMallAiBackend.admin.articleCategories.index(
        connection,
        {
          body: {
            limit,
          } satisfies IShoppingMallAiBackendArticleCategory.IRequest,
        },
      );
    typia.assert(edgePage);
    TestValidator.predicate(
      "Limit edge: response is array",
      Array.isArray(edgePage.data),
    );
    TestValidator.predicate(
      "Limit edge: pagination fields present",
      typeof edgePage.pagination.current === "number",
    );
  }
}
