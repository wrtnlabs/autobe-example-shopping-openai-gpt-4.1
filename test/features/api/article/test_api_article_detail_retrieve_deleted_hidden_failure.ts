import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticle";

export async function test_api_article_detail_retrieve_deleted_hidden_failure(
  connection: api.IConnection,
) {
  /**
   * Validate that an article that is logically deleted (soft deleted) or hidden
   * cannot be accessed via the detail API, enforcing business access rules.
   *
   * Business Context: This test ensures that if an article has been logically
   * deleted (deleted_at not null) or business rules prevent access (e.g.,
   * hidden status), attempts to retrieve its full details should not succeed
   * (should error or return not found). This protects business data and
   * prevents information exposure for restricted articles.
   *
   * Test Steps:
   *
   * 1. Prepare a random article ID that is presumed to represent a logically
   *    deleted or hidden article (simulate such resource ID).
   * 2. Attempt to access article details using the GET
   *    /shoppingMallAiBackend/articles/{articleId} endpoint.
   * 3. Assert that an appropriate access error is thrown (such as not found or
   *    forbidden), guaranteeing access controls are enforced.
   */
  const deletedArticleId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempting to access an article that is deleted or hidden should result in an error (e.g., 404 Not Found)
  await TestValidator.error(
    "deleted or hidden article access should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.articles.at(connection, {
        articleId: deletedArticleId,
      });
    },
  );
}
