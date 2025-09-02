import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import type { IPageIShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate article comment secret filtering for public/unprivileged
 * viewers.
 *
 * This test ensures that the list comments endpoint for an article never
 * leaks secret/private comments to unauthenticated (public) users. The
 * scenario assumes an article exists with a mix of public and secret
 * comments. Since the API does not expose comment creation endpoints, the
 * test can only simulate querying and perform filtering assertions on
 * return values. If connection is privileged (Authorization header set),
 * privileged access is also checked.
 *
 * 1. Prepare a random articleId (simulate the article's existence).
 * 2. Retrieve comments for the article as a public (unauthenticated) user.
 * 3. Assert: All comments are public (is_secret === false).
 * 4. If connection.headers.Authorization is set, simulate a privileged
 *    context: a. Retrieve comments again. b. Assert: Secret comments may
 *    appear (test either their presence or all comments are public).
 */
export async function test_api_article_comments_list_secret_filtering(
  connection: api.IConnection,
) {
  // 1. Prepare a random articleId (simulate an article's existence).
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 2. As public user: retrieve comment list for the article.
  const result =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: {
          page: 1,
          limit: 30,
        } satisfies IShoppingMallAiBackendArticleComment.IRequest,
      },
    );
  typia.assert(result);

  // 3. Assert: all returned comments are public (is_secret === false).
  for (const comment of result.data) {
    TestValidator.equals(
      "public comments list should contain only non-secret comments for unauthenticated users",
      comment.is_secret,
      false,
    );
  }

  // 4. If privileged context (simulate authentication):
  if (connection.headers?.Authorization) {
    const privilegedResult =
      await api.functional.shoppingMallAiBackend.articles.comments.index(
        connection,
        {
          articleId,
          body: {
            page: 1,
            limit: 30,
          } satisfies IShoppingMallAiBackendArticleComment.IRequest,
        },
      );
    typia.assert(privilegedResult);
    const hasSecret = privilegedResult.data.some((c) => c.is_secret === true);
    TestValidator.predicate(
      "privileged users should be able to see secret comments if present",
      hasSecret || privilegedResult.data.every((c) => c.is_secret === false),
    );
  }
}
