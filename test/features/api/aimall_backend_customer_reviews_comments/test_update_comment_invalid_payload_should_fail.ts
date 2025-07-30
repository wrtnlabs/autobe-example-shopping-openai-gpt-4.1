import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that attempting to update a comment on a review with invalid payloads is
 * correctly rejected.
 *
 * This validates input data integrity and enforcement of API-side validation
 * during comment update. The flow is:
 *
 * 1. Create a product review as a customer to provide a target for commenting.
 * 2. Add a comment to the review (setup for the update scenario).
 * 3. Attempt to update the comment using a payload with an empty body (should fail
 *    at runtime and result in a validation error response).
 * 4. Confirm (via TestValidator.error) that the invalid update attempt is
 *    rejected.
 * 5. Non-boolean is_private cannot be tested directly due to strict TypeScript
 *    typing (cannot compile); this check is omitted as required.
 *
 * Notes:
 *
 * - This test focuses on runtime-enforceable validation (e.g., empty string for
 *   body). Any scenario requiring compile-time/type-invalid input is omitted
 *   per E2E test requirements.
 * - If a "get" endpoint for comments becomes available, coverage can be extended
 *   to verify that the comment remains unchanged after failed update.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_update_comment_invalid_payload_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a product review
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Sample Review Title",
        body: "A valid review body.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 2. Add a comment
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "Initial valid comment body.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 3. Attempt to update the comment using an empty body (should fail and return a validation error)
  await TestValidator.error("update with empty body should fail")(async () => {
    await api.functional.aimall_backend.customer.reviews.comments.update(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
        body: {
          body: "",
        },
      },
    );
  });

  // Note: Test for 'is_private' with a non-boolean value is omitted due to compile/type safety constraints.
}
