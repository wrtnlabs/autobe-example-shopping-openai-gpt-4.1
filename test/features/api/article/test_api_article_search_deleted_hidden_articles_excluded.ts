import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";
import type { IPageIShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticle";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_article_search_deleted_hidden_articles_excluded(
  connection: api.IConnection,
) {
  /**
   * Test that logically deleted or hidden (archived) articles are excluded from
   * search results.
   *
   * Business context: For user-facing search, only visible articles should
   * appear. Articles that have been logically deleted or have status 'archived'
   * or 'hidden' (i.e., not visible to end-users) must be omitted from search
   * responses. This test validates that API filtering logic excludes
   * non-visible articles according to business requirements.
   *
   * Steps:
   *
   * 1. Call the search API without any status filter (default - only visible
   *    articles should be returned).
   * 2. Validate the response: all articles should have statuses other than
   *    'archived' or 'hidden'.
   * 3. Call search API with status: 'published' as an explicit filter; invisible
   *    articles must still be excluded.
   * 4. Validate the response: all returned articles must have status exactly
   *    "published" (not any invisible status).
   */

  // Step 1: Call search endpoint without status filter (default: only visible articles returned)
  const response = await api.functional.shoppingMallAiBackend.articles.index(
    connection,
    {
      body: {} satisfies IShoppingMallAiBackendArticle.IRequest,
    },
  );
  typia.assert(response);
  // Step 2: Check that no article in the response has status 'archived' or 'hidden'
  for (const article of response.data) {
    TestValidator.notEquals(
      "archived status not present in visible search results",
      article.status,
      "archived",
    );
    TestValidator.notEquals(
      "hidden status not present in visible search results",
      article.status,
      "hidden",
    );
  }

  // Step 3: Call search API requesting explicit status 'published'
  const responsePublished =
    await api.functional.shoppingMallAiBackend.articles.index(connection, {
      body: {
        status: "published",
      } satisfies IShoppingMallAiBackendArticle.IRequest,
    });
  typia.assert(responsePublished);
  // Step 4: Validate all returned articles are published (visible)
  for (const article of responsePublished.data) {
    TestValidator.equals(
      "only published articles returned when filtering by published",
      article.status,
      "published",
    );
  }
}
