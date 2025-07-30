import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that retrieving a soft-deleted (logically deleted) comment as an
 * administrator fails appropriately.
 *
 * This test ensures that once a comment on a product review is soft-deleted
 * (its deleted_at field is set), even an administrator cannot retrieve the
 * comment using the admin detail API. This confirms that privacy, audit, and
 * content redaction policies are implemented correctly.
 *
 * Test Steps:
 *
 * 1. Create a sample product review (customer endpoint).
 * 2. Add a comment to the review (customer endpoint).
 * 3. Soft-delete the comment via the customer endpoint.
 * 4. As an administrator, attempt to fetch the deleted comment by its review and
 *    comment IDs.
 * 5. Confirm that a 404 Not Found or documented error is returned, indicating the
 *    comment cannot be accessed.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_retrieve_deleted_review_comment_as_admin_should_return_not_found(
  connection: api.IConnection,
) {
  // 1. Create a product review
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

  // 2. Add a comment to the review
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: RandomGenerator.content()()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Soft-delete the comment
  await api.functional.aimall_backend.customer.reviews.comments.erase(
    connection,
    {
      reviewId: review.id,
      commentId: comment.id,
    },
  );

  // 4. Attempt to fetch the deleted comment as administrator (should fail)
  await TestValidator.error("deleted comment retrieval returns not found")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.comments.at(
        connection,
        {
          reviewId: review.id,
          commentId: comment.id,
        },
      );
    },
  );
}
