import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the search for review attachments yields an empty result set after
 * review creation but before any attachment upload.
 *
 * This test verifies the edge case when searching for attachments immediately
 * after a review is created (with no attachments), and with filter criteria
 * that ensure no matches are possible.
 *
 * Steps:
 *
 * 1. Create a review as a customer (ensures a valid reviewId with zero
 *    attachments)
 * 2. As administrator, search for attachments of this review using overly
 *    restrictive filters (e.g., MIME type or file size that cannot possibly
 *    match anything)
 * 3. Assert that the paginated result set is empty (data array is length 0),
 *    pagination metadata is present and correct (current page, limit, records,
 *    and pages reflect an empty set and valid pagination)
 * 4. Assert that no errors are thrown and the call completes successfully
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_search_review_attachments_with_no_results(
  connection: api.IConnection,
) {
  // 1. Create a review as a customer (no attachments uploaded yet)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Review for Empty Attachment Search",
        body: "This review is created to test empty attachment search.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. As administrator, search for attachments with filters that cannot match anything
  const emptySearch =
    await api.functional.aimall_backend.administrator.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_type: "image/never-matching-type",
          file_size_min: 10000000, // Large min size to guarantee no matches
          file_size_max: 99999999,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(emptySearch);

  // 3. Assert results are empty and pagination is valid
  TestValidator.equals("empty data")(emptySearch.data.length)(0);
  TestValidator.equals("pagination current page")(
    emptySearch.pagination.current,
  )(1);
  TestValidator.equals("pagination limit")(emptySearch.pagination.limit)(10);
  TestValidator.equals("pagination records")(emptySearch.pagination.records)(0);
  TestValidator.equals("pagination pages")(emptySearch.pagination.pages)(0);
}
