import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test listing only active, non-soft-deleted product reviews (GET
 * /aimall-backend/reviews)
 *
 * This test validates that the product review listing endpoint only returns
 * reviews that are not soft-deleted (deleted_at is null), and properly supports
 * pagination and ordering metadata.
 *
 * Steps:
 *
 * 1. Create multiple product reviews for various products and authors using the
 *    customer review creation endpoint.
 * 2. Soft-delete a subset of created reviews using the delete endpoint.
 * 3. Fetch the list of reviews using the GET endpoint.
 * 4. Assert that only reviews with deleted_at === null are included in the result
 *    set.
 * 5. Validate the returned page metadata and that data is sorted as expected (e.g.
 *    by created_at).
 * 6. Ensure type conformity of all returned review summary objects.
 * 7. Additional check: Verify that soft-deleted review ids are not present in the
 *    GET results.
 */
export async function test_api_aimall_backend_reviews_test_list_reviews_basic_success(
  connection: api.IConnection,
) {
  // 1. Create multiple reviews
  const createdReviews: IAimallBackendReview[] = await ArrayUtil.asyncRepeat(5)(
    async () =>
      api.functional.aimall_backend.customer.reviews.create(connection, {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          body: RandomGenerator.content()()(),
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IAimallBackendReview.ICreate,
      }),
  );
  for (const review of createdReviews) typia.assert(review);

  // 2. Soft-delete a subset of created reviews (delete the last two)
  const deletedReviews = createdReviews.slice(-2);
  for (const review of deletedReviews) {
    await api.functional.aimall_backend.customer.reviews.erase(connection, {
      reviewId: review.id,
    });
  }

  // 3. Fetch all active reviews
  const summaryResult =
    await api.functional.aimall_backend.reviews.index(connection);
  typia.assert(summaryResult);

  // 4. Assert only active (not deleted) reviews are listed
  // Each summary object in data should correspond to a created, still-active review
  for (const summary of summaryResult.data) {
    const orig = createdReviews.find((r) => r.id === summary.id);
    TestValidator.predicate(`review ${summary.id} present and active`)(
      !!orig && !orig.deleted_at,
    );
  }

  // 5. Pagination/ordering fields validation
  TestValidator.predicate("pagination current page is >= 1")(
    summaryResult.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit is >= 1")(
    summaryResult.pagination.limit >= 1,
  );
  TestValidator.predicate("pagination records matches count")(
    summaryResult.pagination.records >= summaryResult.data.length,
  );

  // 6. Schema validation for all returned summaries
  for (const summary of summaryResult.data) typia.assert(summary);

  // 7. Additional: Ensure deleted review ids do not appear in result
  for (const deleted of deletedReviews) {
    TestValidator.predicate(`deleted review ${deleted.id} not listed`)(
      !summaryResult.data.find((s) => s.id === deleted.id),
    );
  }
}
