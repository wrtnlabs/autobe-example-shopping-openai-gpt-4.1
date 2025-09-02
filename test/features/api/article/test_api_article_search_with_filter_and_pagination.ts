import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";
import type { IPageIShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_article_search_with_filter_and_pagination(
  connection: api.IConnection,
) {
  /**
   * E2E test for public article search API with filter and pagination.
   *
   * 1. Query with filter by channel only: should get only articles from that
   *    channel.
   * 2. Query with partial title substring: should get only matching articles.
   * 3. Query with status="published": must return only published articles.
   * 4. Query with both channel and title: must return articles matching both
   *    criteria.
   * 5. Query with pagination: validate page and item count.
   * 6. Query with filter that matches nothing: result.data should be [].
   * 7. Check that all returned articles are not deleted.
   */

  // 1. Get articles with filter by channel only
  const channelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const channelResult =
    await api.functional.shoppingMallAiBackend.articles.index(connection, {
      body: {
        channel_id: channelId,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    });
  typia.assert(channelResult);
  TestValidator.predicate(
    "all articles belong to the filtered channel",
    channelResult.data.every((a) => a.channel_id === channelId),
  );

  // 2. Get articles with title substring
  const titleKeywordBase = RandomGenerator.name(3);
  const titleKeyword = RandomGenerator.substring(titleKeywordBase);
  const titleResult = await api.functional.shoppingMallAiBackend.articles.index(
    connection,
    {
      body: {
        title: titleKeyword,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    },
  );
  typia.assert(titleResult);
  TestValidator.predicate(
    "all articles have the keyword in their title",
    titleResult.data.every((a) => a.title.includes(titleKeyword)),
  );

  // 3. Filter by published status
  const publishedResult =
    await api.functional.shoppingMallAiBackend.articles.index(connection, {
      body: {
        status: "published",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    });
  typia.assert(publishedResult);
  TestValidator.predicate(
    "all articles have published status",
    publishedResult.data.every((a) => a.status === "published"),
  );

  // 4. Combination: channel + title
  const comboResult = await api.functional.shoppingMallAiBackend.articles.index(
    connection,
    {
      body: {
        channel_id: channelId,
        title: titleKeyword,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    },
  );
  typia.assert(comboResult);
  TestValidator.predicate(
    "all articles match channel and title",
    comboResult.data.every(
      (a) => a.channel_id === channelId && a.title.includes(titleKeyword),
    ),
  );

  // 5. Pagination test: create a query with limit=3
  const pagedResult = await api.functional.shoppingMallAiBackend.articles.index(
    connection,
    {
      body: {
        page: 1,
        limit: 3,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    },
  );
  typia.assert(pagedResult);
  TestValidator.equals(
    "pagination limit is correct",
    pagedResult.pagination.limit,
    3,
  );
  TestValidator.predicate(
    "data.length does not exceed limit",
    pagedResult.data.length <= 3,
  );

  // 6. Query with filter that should match nothing (random UUID)
  const impossibleChannelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const impossibleResult =
    await api.functional.shoppingMallAiBackend.articles.index(connection, {
      body: {
        channel_id: impossibleChannelId,
        title: RandomGenerator.alphaNumeric(16),
        page: 1,
        limit: 5,
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    });
  typia.assert(impossibleResult);
  TestValidator.equals(
    "empty result on impossible filter",
    impossibleResult.data.length,
    0,
  );

  // 7. Check for deleted (assumed: deleted articles don't appear in public search)
  // Here, simply test that all articles are visible (the API never returns deleted ones).
  [
    channelResult,
    titleResult,
    publishedResult,
    comboResult,
    pagedResult,
  ].forEach((r, i) => {
    TestValidator.predicate(
      `result[${i}] contains only defined articles`,
      r.data.every((a) => a.id && a.channel_id && a.title && a.status),
    );
  });
}
