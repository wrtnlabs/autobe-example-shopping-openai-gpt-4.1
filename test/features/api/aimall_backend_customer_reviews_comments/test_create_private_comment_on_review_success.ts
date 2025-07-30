import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test posting a private comment to a review and privacy enforcement.
 *
 * This test covers the scenario where a logged-in customer creates a private
 * comment (is_private=true) on a review.
 *
 * Validates:
 *
 * - Private comment is correctly associated with the review
 * - The is_private field in the response is true
 *
 * Limitations:
 *
 * - Cannot verify access control enforcement for other users/roles due to lack of
 *   retrieval APIs
 *
 * Steps:
 *
 * 1. Customer creates a dummy product review as prerequisite
 * 2. Same customer posts a private comment on the review
 * 3. Verifies the comment's is_private property and correct review linkage
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_create_private_comment_on_review_success(
  connection: api.IConnection,
) {
  // 1. Create a dummy product review to comment on
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Post a private comment under the review as the author
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: RandomGenerator.paragraph()(),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Check privacy flag and parent review linkage
  TestValidator.equals("is_private should be true")(comment.is_private)(true);
  TestValidator.equals("review_id linkage")(comment.review_id)(review.id);

  // Note: Cannot test access for admins/other users (API for such is not available)
}
