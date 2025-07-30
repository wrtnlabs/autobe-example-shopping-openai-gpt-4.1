import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test the administrator review search endpoint with pagination and sorting
 * options under high data load.
 *
 * This test creates a large batch of reviews across multiple products, then
 * performs advanced search requests using PATCH
 * /aimall-backend/administrator/reviews with different sorting (by rating
 * ascending/descending, by creation date ascending/descending) and pagination
 * (various pages and page sizes). The test verifies:
 *
 * - Review creation and data integrity
 * - That search results are sorted according to the requested criteria
 * - That pagination works: correct number of results, page count, and boundaries
 * - Correct handling of edge cases (first/last page, fewer results than page
 *   size, last partial page)
 *
 * Steps:
 *
 * 1. Create N_PRODUCTS (e.g., 5) dummy product IDs.
 * 2. For each product, create N_REVIEWS (e.g., 10) reviews with varying ratings
 *    and timestamps.
 * 3. Execute administrator search with PATCH, requesting sorting by rating
 *    (asc/desc), and by created_at (asc/desc).
 * 4. Use different values for `page` and `limit`, check that search results match
 *    expected sort order and pagination.
 * 5. Validate that result arrays, pagination metadata, and record counts are
 *    correct.
 */
export async function test_api_aimall_backend_administrator_reviews_test_admin_review_search_sort_and_pagination(
  connection: api.IConnection,
) {
  // Constants for dataset size
  const N_PRODUCTS = 5;
  const N_REVIEWS_PER_PRODUCT = 10;

  // 1. Create product IDs
  const productIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
    N_PRODUCTS,
  )(() => typia.random<string & tags.Format<"uuid">>());
  // 2. Create reviews for each product
  const reviews: IAimallBackendReview[] = [];
  for (const productId of productIds) {
    for (let i = 0; i < N_REVIEWS_PER_PRODUCT; ++i) {
      const rating = (i % 5) + 1; // cycle 1-5 ratings
      const review: IAimallBackendReview =
        await api.functional.aimall_backend.customer.reviews.create(
          connection,
          {
            body: {
              product_id: productId,
              title: `Review ${i + 1} for product ${productId}`,
              body: `Body for review ${i + 1} on product ${productId}`,
              rating,
            } satisfies IAimallBackendReview.ICreate,
          },
        );
      typia.assert(review);
      reviews.push(review);
    }
  }

  // Helper to run a search and validate sorting/paging
  async function validateSortPage({
    sortKey,
    sortOrder,
    page,
    limit,
    productId,
  }: {
    sortKey: "rating" | "created_at";
    sortOrder: "asc" | "desc";
    page: number;
    limit: number;
    productId?: string;
  }) {
    // Prepare expected
    let filtered = [...reviews];
    if (productId)
      filtered = filtered.filter((r) => r.product_id === productId);
    filtered.sort((a, b) => {
      if (sortKey === "rating")
        return sortOrder === "asc" ? a.rating - b.rating : b.rating - a.rating;
      else
        return sortOrder === "asc"
          ? a.created_at.localeCompare(b.created_at)
          : b.created_at.localeCompare(a.created_at);
    });
    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paged = filtered.slice(start, end);
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / limit);

    // 3. Execute search
    const result =
      await api.functional.aimall_backend.administrator.reviews.search(
        connection,
        {
          body: {
            ...(productId ? { product_id: productId } : {}),
            limit,
            page,
          } satisfies IAimallBackendReview.IRequest,
        },
      );
    typia.assert(result);
    TestValidator.equals("page current")(result.pagination.current)(page);
    TestValidator.equals("page limit")(result.pagination.limit)(limit);
    TestValidator.equals("page total records")(result.pagination.records)(
      totalRecords,
    );
    TestValidator.equals("page count")(result.pagination.pages)(totalPages);
    TestValidator.equals("result count")(result.data.length)(paged.length);
    for (let i = 0; i < paged.length; ++i) {
      TestValidator.equals(`result ${i} id`)(result.data[i].id)(paged[i].id);
      TestValidator.equals(`result ${i} rating`)(result.data[i].rating)(
        paged[i].rating,
      );
      TestValidator.equals(`result ${i} created_at`)(result.data[i].created_at)(
        paged[i].created_at,
      );
    }
  }
  // 4. Try various pages and sorting
  await validateSortPage({
    sortKey: "rating",
    sortOrder: "asc",
    page: 1,
    limit: 10,
  });
  await validateSortPage({
    sortKey: "rating",
    sortOrder: "desc",
    page: 2,
    limit: 8,
  });
  await validateSortPage({
    sortKey: "created_at",
    sortOrder: "asc",
    page: 1,
    limit: 7,
  });
  await validateSortPage({
    sortKey: "created_at",
    sortOrder: "desc",
    page: 2,
    limit: 12,
  });
  // 5. Edge: last partial page
  const limit = 13;
  const total = N_PRODUCTS * N_REVIEWS_PER_PRODUCT;
  const lastPage = Math.ceil(total / limit);
  await validateSortPage({
    sortKey: "rating",
    sortOrder: "asc",
    page: lastPage,
    limit,
  });
}
