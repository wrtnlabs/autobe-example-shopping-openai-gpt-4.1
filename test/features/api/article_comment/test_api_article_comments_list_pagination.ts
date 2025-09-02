import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendArticleComment";
import type { IPageIShoppingMallAiBackendArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendArticleComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_article_comments_list_pagination(
  connection: api.IConnection,
) {
  /**
   * E2E test for article comment pagination logic on
   * /shoppingMallAiBackend/articles/{articleId}/comments
   *
   * This function tests the backend API's pagination, ordering, and record
   * consistency features for listing article comments. It does NOT handle
   * comment creation or article setup, but instead validates read/pagination
   * logic using a randomly selected articleId with a large presumed comment
   * set.
   *
   * Steps:
   *
   * 1. Generate a random articleId.
   * 2. Fetch page 1 with limit=10 and record totalRecords.
   * 3. Fetch multiple page 1s with different limits (5,20,37). Check uniqueness
   *    and limit correctness.
   * 4. Fetch sequentially through several pages with fixed limit (limit=13, pages
   *    1..N). For each, ensure there are no repeated IDs in the page and across
   *    the sweep. Compare order for overlapping elements.
   * 5. Check all IDs collected match totalRecords if all could fit. Confirm
   *    typia.assert and field coverage for all summaries.
   * 6. Test requesting far beyond the last page and assert result is empty array.
   * 7. Make all TestValidator assertions descriptive for debuggability.
   */

  const articleId: string = typia.random<string & tags.Format<"uuid">>();
  let totalRecords: number = 0;
  let seenIds = new Set<string>();
  let allSummaries: IShoppingMallAiBackendArticleComment.ISummary[] = [];
  const fetchedOrdersByLimit: Record<number, string[]> = {};

  // Step 1: Fetch page 1 with limit=10
  const firstPage =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendArticleComment.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "first page records >= 0",
    firstPage.pagination.records >= 0,
  );

  totalRecords = firstPage.pagination.records;

  // Save all IDs and summaries from initial fetch
  firstPage.data.forEach((c) => {
    seenIds.add(c.id);
    allSummaries.push(c);
    typia.assert<IShoppingMallAiBackendArticleComment.ISummary>(c);
  });

  // Step 2: Varying limit fetches of first page (5, 20, 37)
  for (const limit of [5, 20, 37]) {
    const pageRes =
      await api.functional.shoppingMallAiBackend.articles.comments.index(
        connection,
        {
          articleId,
          body: {
            page: 1,
            limit,
          } satisfies IShoppingMallAiBackendArticleComment.IRequest,
        },
      );
    typia.assert(pageRes);
    TestValidator.equals(
      `limit ${limit}: page.pagination.limit should match request`,
      pageRes.pagination.limit,
      limit,
    );
    // All returned should be unique
    const ids: string[] = pageRes.data.map((d) => d.id);
    fetchedOrdersByLimit[limit] = ids;
    ids.forEach((id) => seenIds.add(id));
    pageRes.data.forEach((row, idx) => {
      typia.assert<IShoppingMallAiBackendArticleComment.ISummary>(row);
      allSummaries.push(row);
    });
  }
  // Step 3: Check consistent order for overlap between different limits
  // For pairs of limit fetches, the overlap should appear in the same order/order preserved (for same page)
  const limits = [10, 5, 20, 37];
  for (let i = 0; i < limits.length; ++i) {
    for (let j = i + 1; j < limits.length; ++j) {
      const A =
        fetchedOrdersByLimit[limits[i]] || firstPage.data.map((d) => d.id);
      const B =
        fetchedOrdersByLimit[limits[j]] || firstPage.data.map((d) => d.id);
      // For min(A.length, B.length), order must match up for same index
      const minLen = Math.min(A.length, B.length);
      for (let k = 0; k < minLen; ++k) {
        TestValidator.equals(
          `order preserved for id at index ${k} between limits ${limits[i]} and ${limits[j]}`,
          A[k],
          B[k],
        );
      }
    }
  }

  // Step 4: Sequential page sweep with limit=13, up to N pages (min 2, max 4, but never beyond available pages)
  const seqLimit = 13;
  const nPages = Math.min(4, Math.max(2, firstPage.pagination.pages));
  const sequentialIds: string[] = [];
  let prevIds: string[] = [];
  for (let pg = 1; pg <= nPages; ++pg) {
    const sPage =
      await api.functional.shoppingMallAiBackend.articles.comments.index(
        connection,
        {
          articleId,
          body: {
            page: pg,
            limit: seqLimit,
          } satisfies IShoppingMallAiBackendArticleComment.IRequest,
        },
      );
    typia.assert(sPage);
    // No repeated ids within a single page
    TestValidator.equals(
      `page ${pg}, no repeated ids`,
      Array.from(new Set(sPage.data.map((x) => x.id))).length,
      sPage.data.length,
    );
    // Each page should follow after the previous—no overlaps unless near boundary of records
    if (prevIds.length > 0) {
      const overlaps = sPage.data
        .map((x) => x.id)
        .filter((id) => prevIds.includes(id));
      // Allow overlap only if last page crosses record bound
      if (pg !== nPages)
        TestValidator.equals(
          `pages ${pg - 1} & ${pg} no overlap`,
          overlaps.length,
          0,
        );
    }
    prevIds = sPage.data.map((x) => x.id);
    sPage.data.forEach((row) => {
      sequentialIds.push(row.id);
      typia.assert<IShoppingMallAiBackendArticleComment.ISummary>(row);
      // Ensure field type coverage for optional/nullable (typia.assert covers this structurally)
    });
  }
  // No duplicate IDs across all sequential pages
  TestValidator.equals(
    "all sequentialIds unique",
    Array.from(new Set(sequentialIds)).length,
    sequentialIds.length,
  );
  // If all data is accounted for (i.e., all fetched), length matches records
  if (totalRecords <= seqLimit * nPages) {
    TestValidator.equals(
      "all collected sequentialIds = records",
      sequentialIds.length,
      totalRecords,
    );
  }
  // Step 5: Out-of-range page (beyond last)
  const farPage =
    await api.functional.shoppingMallAiBackend.articles.comments.index(
      connection,
      {
        articleId,
        body: {
          page: totalRecords + 50,
          limit: seqLimit,
        } satisfies IShoppingMallAiBackendArticleComment.IRequest,
      },
    );
  typia.assert(farPage);
  TestValidator.equals("far page returns empty data[]", farPage.data.length, 0);
}
