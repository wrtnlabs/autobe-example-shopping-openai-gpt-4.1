import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validates error handling when an administrator attempts to retrieve a product
 * review by a nonexistent reviewId.
 *
 * This test ensures that the system returns a standardized 404 error with an
 * appropriate audit-compliance message if an admin tries to fetch a review by a
 * random, unassigned UUID. No resource creation is required.
 *
 * Steps:
 *
 * 1. Generate a random UUID which is not assigned to any review (high probability
 *    with typia.random).
 * 2. Call the admin review retrieval endpoint using this random reviewId.
 * 3. Expect the API to throw a 404 HttpError, and ensure that the error object
 *    contains a clear and descriptive message.
 */
export async function test_api_aimall_backend_administrator_reviews_test_get_review_detail_as_admin_for_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID which is not assigned to any review
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt retrieval and expect standardized 404 error response
  await TestValidator.error("Should return 404 for nonexistent review")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.at(connection, {
        reviewId: nonExistentReviewId,
      });
    },
  );
}
