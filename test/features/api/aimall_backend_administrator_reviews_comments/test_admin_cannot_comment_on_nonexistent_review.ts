import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate administrator comment creation fails for nonexistent reviews.
 *
 * This test confirms that the API does not allow administrators to comment on
 * reviews that do not exist. It checks that validation for the existence of the
 * review is correctly enforced, and that attempting to comment with an invalid
 * reviewId results in a proper error response (404 Not Found).
 *
 * Steps:
 *
 * 1. Generate a random (valid-format) UUID for reviewId which does not exist in
 *    the system.
 * 2. Attempt to create a comment via the admin endpoint for that invalid reviewId,
 *    with a typical comment payload.
 * 3. Assert that the API throws an error, validating correct 404 error handling
 *    and enforcing data integrity.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_admin_cannot_comment_on_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Generate random UUID for an invalid/nonexistent review
  const invalidReviewId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare comment creation input referring to the nonexistent review
  const commentInput: IAimallBackendComment.ICreate = {
    review_id: invalidReviewId,
    body: "Test comment for non-existent review (should trigger 404 error)",
    is_private: false,
    post_id: null,
    parent_id: null,
  };

  // 3. Attempt to create and assert that an error (404) is thrown
  await TestValidator.error("cannot comment on nonexistent review")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.comments.create(
        connection,
        {
          reviewId: invalidReviewId,
          body: commentInput,
        },
      );
    },
  );
}
