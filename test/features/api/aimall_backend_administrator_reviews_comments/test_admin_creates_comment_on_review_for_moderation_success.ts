import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate administrator moderation comment creation on a product review.
 *
 * Business context: This test ensures that an administrator can create a
 * comment (for moderation/compliance) directly on any product review, and all
 * linkage and audit fields behave as expected.
 *
 * Steps:
 *
 * 1. Create a new product review as a customer (preparation/dependency).
 * 2. As administrator, create a moderation comment on that review (using API).
 * 3. Confirm the comment is correctly attached: review_id, top-level comment
 *    fields, privacy flag, audit fields (id/timestamps) and content are set as
 *    defined.
 */
export async function test_api_aimall_backend_administrator_reviews_comments_test_admin_creates_comment_on_review_for_moderation_success(
  connection: api.IConnection,
) {
  // 1. Customer creates a product review (dependency: ensures target for admin comment exists)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Excellent product!",
        body: "This works very well — highly recommend.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 2. Administrator creates a moderation comment on the review
  const commentBody = {
    review_id: review.id,
    body: "This review has been flagged for verification. Please ensure compliance with guidelines.",
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const comment =
    await api.functional.aimall_backend.administrator.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 3. Business logic validation
  TestValidator.equals("comment linked to correct review")(comment.review_id)(
    review.id,
  );
  TestValidator.equals("top-level comment (no parent_id)")(comment.parent_id)(
    null,
  );
  TestValidator.equals("not a post comment")(comment.post_id)(null);
  TestValidator.equals("body matches")(comment.body)(commentBody.body);
  TestValidator.equals("privacy flag")(comment.is_private)(false);
  TestValidator.predicate("id exists")(
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate("created_at valid")(
    typeof comment.created_at === "string" && comment.created_at.length > 0,
  );
  TestValidator.predicate("updated_at valid")(
    typeof comment.updated_at === "string" && comment.updated_at.length > 0,
  );
}
