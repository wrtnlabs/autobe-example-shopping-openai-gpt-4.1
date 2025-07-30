import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that creating a comment on a non-existent review fails.
 *
 * Ensures that the API rejects attempts to create a comment on a reviewId that
 * doesn't exist (i.e., deleted or invalid). This simulates a customer
 * attempting to comment on a non-existent review, and expects the API to return
 * an error (e.g., 404 Not Found).
 *
 * Steps:
 *
 * 1. Generate a random (very likely non-existent) reviewId (UUID).
 * 2. Prepare a valid comment creation payload (with that reviewId).
 * 3. Attempt to create the comment; expect the API call to fail (error thrown).
 * 4. No further validation needed as scenario is about failure on invalid
 *    reference.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_fail_create_comment_on_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Generate a non-existent reviewId
  const nonExistentReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Build a valid comment creation payload for that reviewId
  const payload: IAimallBackendComment.ICreate = {
    review_id: nonExistentReviewId,
    post_id: null, // Only a review comment
    parent_id: null, // Not a reply, root comment
    body: "This is a comment for a review that should not exist.",
    is_private: false,
  };

  // 3. Attempt to create the comment, expecting an error
  await TestValidator.error("should fail for non-existent review")(async () => {
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: nonExistentReviewId,
        body: payload,
      },
    );
  });
}
