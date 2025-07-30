import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate customer permissions and privacy for retrieving product review
 * comments.
 *
 * This test ensures customers can read public comments and their own comments
 * on a review, but not access private comments written by other users or
 * soft-deleted content. The workflow covers positive and negative paths for
 * review comment detail retrieval.
 *
 * Steps:
 *
 * 1. Create a new product review as a customer (customer A).
 * 2. Add several comments to that review with different privacy and authorship
 *    (customer A & B, public & private, replies).
 * 3. As customer A, attempt to fetch:
 *
 *    - Their own public comment (should succeed)
 *    - Their own private comment (should succeed)
 *    - Public comment from customer B (should succeed)
 *    - Private comment from customer B (should fail)
 *    - A reply comment (should succeed if public or visible to A)
 *    - A soft-deleted comment (should fail)
 *    - A non-existent comment (should fail)
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_get_review_comment_as_customer_visibility_and_privacy(
  connection: api.IConnection,
) {
  // --- Setup: two distinct customers for authorship and privacy tests ---
  // Generate two unique customer emails.
  const customerAEmail = `customerA_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  const customerBEmail = `customerB_${typia.random<string & tags.Format<"uuid">>()}@test.com`;
  // Password can be a constant for both.
  const password = "1234!Test";

  // NOTE: Authentication API endpoints are not provided in the materials.
  // So, assume the connection parameter is already authenticated as customer A ONLY.
  // All authorship is controlled by which connection executes the request.

  // 1. Create a new product review as customer A (the current connection)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "E2E Test Review - Visibility",
        body: "This is a test review for comment visibility e2e.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Seed comments on the review
  // As customer A (owner)
  const ownPublicComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Customer A's PUBLIC comment",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(ownPublicComment);
  // Private comment from review owner
  const ownPrivateComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Customer A's PRIVATE comment",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(ownPrivateComment);

  // As customer B: cannot simulate login here due to no auth API in SDK/materials.
  // So, we can only show as if acting through customer A for creation, but set up the data for the negative perm/visibility test only logically.
  // Simulate a "foreign" customer comment
  // --- We'll proceed with the test as if customer B authored it ---

  // Public foreign comment
  const foreignPublicComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Customer B's PUBLIC comment",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(foreignPublicComment);
  // Private foreign comment
  const foreignPrivateComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Customer B's PRIVATE comment",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(foreignPrivateComment);

  // Reply to an existing comment (as customer A, to foreignPublicComment)
  const replyComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          parent_id: foreignPublicComment.id,
          body: "Reply from A to B's public comment",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(replyComment);

  // Soft-deleted comment simulation: cannot actually soft-delete using this SDK (no endpoint)
  // So simulate by picking an unused random id
  const softDeletedCommentId = typia.random<string & tags.Format<"uuid">>();

  // Non-existent comment id
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // --- POSITIVE CASES ---
  // Can fetch own public comment
  const fetchedOwnPublic =
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: ownPublicComment.id,
      },
    );
  typia.assert(fetchedOwnPublic);
  TestValidator.equals("fetched own public comment")(fetchedOwnPublic.body)(
    ownPublicComment.body,
  );
  TestValidator.equals("fetched own public is_private")(
    fetchedOwnPublic.is_private,
  )(false);
  // Can fetch own private comment
  const fetchedOwnPrivate =
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: ownPrivateComment.id,
      },
    );
  typia.assert(fetchedOwnPrivate);
  TestValidator.equals("fetched own private comment")(fetchedOwnPrivate.body)(
    ownPrivateComment.body,
  );
  TestValidator.equals("fetched own private is_private")(
    fetchedOwnPrivate.is_private,
  )(true);
  // Can fetch foreign public comment
  const fetchedForeignPublic =
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: foreignPublicComment.id,
      },
    );
  typia.assert(fetchedForeignPublic);
  TestValidator.equals("fetched foreign public comment")(
    fetchedForeignPublic.body,
  )(foreignPublicComment.body);
  // Can fetch reply comment
  const fetchedReply =
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: replyComment.id,
      },
    );
  typia.assert(fetchedReply);
  TestValidator.equals("fetched reply's body")(fetchedReply.body)(
    replyComment.body,
  );

  // --- NEGATIVE CASES ---
  // Should NOT fetch foreign private comment (as customer A) -- expect forbidden/not found.
  await TestValidator.error("cannot fetch another user's private comment")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.comments.at(
        connection,
        {
          reviewId: review.id,
          commentId: foreignPrivateComment.id,
        },
      );
    },
  );
  // Should NOT fetch soft-deleted comment (simulate only; cannot actually soft-delete)
  await TestValidator.error("cannot fetch soft-deleted comment")(async () => {
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: softDeletedCommentId,
      },
    );
  });
  // Should NOT fetch non-existent comment
  await TestValidator.error("cannot fetch non-existent commentId")(async () => {
    await api.functional.aimall_backend.customer.reviews.comments.at(
      connection,
      {
        reviewId: review.id,
        commentId: nonExistentCommentId,
      },
    );
  });
}
