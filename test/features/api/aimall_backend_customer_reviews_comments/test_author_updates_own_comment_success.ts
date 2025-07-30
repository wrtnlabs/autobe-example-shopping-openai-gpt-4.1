import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that a customer can update their own comment on a product review.
 *
 * Scenario:
 *
 * 1. Create a product review as the customer (precondition: customer is
 *    authenticated by context).
 * 2. Create a comment on this review as the same customer.
 * 3. The customer edits their own comment, updating its body and privacy flag.
 * 4. Check that the update is successful:
 *
 *    - The returned comment object has updated 'body', 'is_private', and a changed
 *         'updated_at' timestamp.
 *    - The 'id' (commentId) and 'review_id' fields remain the same and match
 *         previous values.
 *    - The 'created_at' timestamp remains unchanged.
 *    - Other audit fields (customer_id, deleted_at) are as expected.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_author_updates_own_comment_success(
  connection: api.IConnection,
) {
  // 1. Create a product review as the customer
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "E2E - update comment test",
    body: "Review for edit comment functionality.",
    rating: typia.random<number & tags.Type<"int32">>(),
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewInput,
    },
  );
  typia.assert(review);

  // 2. Create a comment authored by customer
  const originalCommentInput: IAimallBackendComment.ICreate = {
    review_id: review.id,
    body: "Initial comment before update.",
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: originalCommentInput,
      },
    );
  typia.assert(comment);

  // 3. Update the comment as author (edit body, privacy flag)
  const updatedBody = "Edited comment content!";
  const updatedPrivate = true;
  const prevUpdatedAt = comment.updated_at;
  const prevCreatedAt = comment.created_at;
  const updated =
    await api.functional.aimall_backend.customer.reviews.comments.update(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
        body: {
          body: updatedBody,
          is_private: updatedPrivate,
        },
      },
    );
  typia.assert(updated);

  // 4. Validate update output for proper mutation & audit stability
  TestValidator.equals("updated content matches")(updated.body)(updatedBody);
  TestValidator.equals("privacy flag propagated")(updated.is_private)(
    updatedPrivate,
  );
  TestValidator.equals("comment id stable")(updated.id)(comment.id);
  TestValidator.equals("review id stable")(updated.review_id)(
    comment.review_id,
  );
  TestValidator.equals("created_at stable")(updated.created_at)(prevCreatedAt);
  TestValidator.notEquals("updated_at mutates")(updated.updated_at)(
    prevUpdatedAt,
  );
  TestValidator.equals("customer unchanged")(updated.customer_id)(
    comment.customer_id,
  );
  TestValidator.equals("deleted_at unchanged")(updated.deleted_at)(
    comment.deleted_at,
  );
}
