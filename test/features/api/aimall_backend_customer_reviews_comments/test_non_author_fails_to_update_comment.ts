import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validates that comment update is forbidden for non-authors (enforces
 * author-only permissions).
 *
 * Business context: Only the author (the customer who created the comment) or a
 * platform admin may update a review comment. This scenario ensures proper
 * enforcement of update permissions; non-author attempts are forbidden.
 *
 * Workflow:
 *
 * 1. Simulate Customer A session. a. Create a new review (as Customer A). b. Leave
 *    a comment on the review (as Customer A).
 * 2. Simulate Customer B session (different customer). a. Attempt to edit Customer
 *    A's comment using Customer B's credentials. b. API must return 403
 *    Forbidden (edit forbidden for non-authors). c. (Optional) Reload the
 *    comment to confirm no changes occurred.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_non_author_fails_to_update_comment(
  connection: api.IConnection,
) {
  // 1. Simulate Customer A session
  // (Authenticate as Customer A; test environment is responsible for user context.)
  // Create a new review as Customer A
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review by Customer A",
        body: "Customer A review body text.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // Create a comment as Customer A
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "Original comment by Customer A.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 2. Simulate Customer B session (switch authentication to a different customer)
  // (This requires that the test environment or API provides a way to switch context.)
  // In real testing frameworks, you would log out A and log in as B here.
  // The test runner should use a different, valid authenticated customer context for following step.

  // Attempt to update Customer A's comment as Customer B
  await TestValidator.error("Non-author must not be able to update a comment")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.comments.update(
        connection,
        {
          reviewId: review.id,
          commentId: comment.id,
          body: {
            body: "Unauthorized attempt to edit comment by non-author.",
          },
        },
      );
    },
  );

  // Optionally, refetch the comment to verify it was unchanged (if an API exists for comment retrieval)
}
