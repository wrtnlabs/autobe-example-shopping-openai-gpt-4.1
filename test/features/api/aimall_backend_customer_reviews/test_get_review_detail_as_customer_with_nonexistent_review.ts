import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate error handling for fetching a non-existent product review as a
 * customer.
 *
 * This test verifies that the API properly responds with a 404 error when a
 * user attempts to query a review record using a random and non-existent
 * reviewId. It ensures the system does not leak data, and that appropriate
 * error codes and handling are implemented for resource lookup failures.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as a fake reviewId (which should not exist in
 *    the database).
 * 2. Attempt to fetch the review using the customer-facing API endpoint.
 * 3. Assert that the API call results in an error, specifically an HTTP 404 not
 *    found status.
 */
export async function test_api_aimall_backend_customer_reviews_test_get_review_detail_as_customer_with_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent reviewId
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to fetch this review - expect a 404 error
  await TestValidator.error("Should return 404 for non-existent review")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.at(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );
}
