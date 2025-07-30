import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate successful creation of a public comment on a product review by a
 * logged-in customer.
 *
 * This test performs the complete workflow:
 *
 * 1. Creates a new product review as the logged-in customer (dependency
 *    requirement).
 * 2. Leaves a **public** (is_private: false) comment on that specific review,
 *    providing a body.
 * 3. Asserts that the returned comment object is:
 *
 *    - Correctly linked to the target review (review_id matches the new review)
 *    - Authored by the logged-in customer (customer_id set)
 *    - Includes correct data for audit and compliance (created_at, updated_at
 *         present)
 *    - Is a root (not a reply): parent_id is null
 *    - Not attached to a post (post_id is null for review comments)
 *    - Not deleted (deleted_at is null)
 *    - Carries the submitted comment body and is public
 *
 * This ensures API contract, business workflow, privacy rules, and output shape
 * for comment threads on reviews.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_create_public_comment_on_review_success(
  connection: api.IConnection,
) {
  // 1. Create a product review as the logged-in customer (dependency)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: "Great product for the price!",
        body: "Solid value and fast shipping.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Submit a public comment on the review
  const commentBody = "Thanks for your detailed review!";
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: commentBody,
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Assert response correctness and business logic
  TestValidator.equals("review linkage")(comment.review_id)(review.id);
  TestValidator.equals("comment body")(comment.body)(commentBody);
  TestValidator.equals("privacy should be public")(comment.is_private)(false);
  TestValidator.predicate("author must exist")(
    !!comment.customer_id && comment.customer_id.length > 0,
  );
  TestValidator.predicate("created_at is valid")(!!comment.created_at);
  TestValidator.predicate("updated_at is valid")(!!comment.updated_at);
  TestValidator.equals("parent_id is null for root comment")(comment.parent_id)(
    null,
  );
  TestValidator.equals("post_id is null for review comments")(comment.post_id)(
    null,
  );
  TestValidator.equals("not deleted")(comment.deleted_at)(null);
}
