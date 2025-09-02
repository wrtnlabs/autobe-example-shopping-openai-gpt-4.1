import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import type { IPageIShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_article_comments_list_success_public(
  connection: api.IConnection,
) {
  /**
   * Validate the successful retrieval of comment lists for a public article,
   * covering filtering, pagination, and public access restrictions.
   *
   * This test ensures the comments API under PATCH
   * /shoppingMallAiBackend/articles/{articleId}/comments accurately returns
   * only public (non-secret, not deleted) comments for an article, honoring
   * filter, pagination, and search criteria in a public (guest/unauthenticated)
   * context.
   *
   * Steps:
   *
   * 1. Simulate a valid articleId.
   * 2. Request default comments list (no filter). Validate only public and
   *    non-deleted comments are returned.
   * 3. Filter by status='visible'. Validate all results match.
   * 4. Filter by is_secret=false. Validate all results are public.
   * 5. Search with q=<word> (from sample comment body, if available). Validate all
   *    found comments contain that word.
   * 6. Test pagination (page=1/2, limit=2). Validate lengths and pages differ.
   * 7. Filter by author_id (from existing comment sample, if available). Validate
   *    all have the correct author.
   *
   * - Note: For simulated/mockup data, sample-based q and author_id filters may
   *   be skipped if no matching comment is present (to allow pass/fail in mock
   *   mode).
   */

  // 1. Simulate a valid articleId
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 2. Default listing (no filters)
  const outputDefault =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: {},
      },
    );
  typia.assert(outputDefault);
  TestValidator.predicate(
    "Default listing: all returned comments are public (is_secret=false)",
    outputDefault.data.every((c) => !c.is_secret),
  );
  TestValidator.predicate(
    'Default listing: no deleted comments (status != "deleted")',
    outputDefault.data.every((c) => c.status !== "deleted"),
  );

  // Handle empty list in simulation - skip remaining tests if no comments
  if (!outputDefault.data.length) {
    return;
  }

  // Collect a visible, public comment for further tests (if available)
  const comment = outputDefault.data.find(
    (c) => c.status === "visible" && !c.is_secret,
  );

  // 3. Filter by status="visible"
  const outputVisible =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: { status: "visible" },
      },
    );
  typia.assert(outputVisible);
  TestValidator.predicate(
    "Filter status=visible: all comments returned have status visible",
    outputVisible.data.every((c) => c.status === "visible"),
  );

  // 4. Filter by is_secret=false
  const outputPublic =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: { is_secret: false },
      },
    );
  typia.assert(outputPublic);
  TestValidator.predicate(
    "Filter is_secret=false: all comments are public",
    outputPublic.data.every((c) => !c.is_secret),
  );

  // 5. Search with q=<word> from a sample comment's body, if available
  // This prevents test failures in simulation/mock mode if no sample exists.
  if (comment) {
    const { body } = comment;
    const keyword = body.split(" ")[0]; // Use first word
    const outputQ =
      await api.functional.shoppingMallAiBackend.articles.comments.index(
        connection,
        {
          articleId,
          body: { q: keyword },
        },
      );
    typia.assert(outputQ);
    TestValidator.predicate(
      "Full-text search (q): all results contain keyword",
      outputQ.data.every((c) => c.body.includes(keyword)),
    );
  }

  // 6. Pagination: fetch page 1 and 2 with limit=2
  const outputPage1 =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(outputPage1);
  TestValidator.equals(
    "Pagination: data length matches limit (<=2)",
    outputPage1.data.length <= 2,
    true,
  );
  const outputPage2 =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: { page: 2, limit: 2 },
      },
    );
  typia.assert(outputPage2);
  TestValidator.equals(
    "Pagination: second page, data length matches limit (<=2)",
    outputPage2.data.length <= 2,
    true,
  );
  TestValidator.notEquals(
    "Pagination: page1 and page2 data differ",
    outputPage1.data,
    outputPage2.data,
  );

  // 7. Author filter using author_id from comment, if present
  if (comment?.author_id) {
    const outputAuthor =
      await api.functional.shoppingMallAiBackend.articles.comments.index(
        connection,
        {
          articleId,
          body: { author_id: comment.author_id },
        },
      );
    typia.assert(outputAuthor);
    TestValidator.predicate(
      "Author filter: all results have the correct author",
      outputAuthor.data.every((c) => c.author_id === comment.author_id),
    );
  }

  // Note: Sort coverage (sort param) not exercised here due to lack of mandatory sort field enumeration or requirements in this test scenario.
}
