import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that unauthenticated users cannot create comments on reviews.
 *
 * Business context:
 *
 * - Only authenticated customers are permitted to create comments on product
 *   reviews.
 * - An unauthenticated (guest) user should not be able to submit a comment even
 *   if a valid comment body is provided.
 * - The API should return an authentication/authorization error (e.g., 401
 *   Unauthorized), and no comment record is created.
 *
 * Test Steps:
 *
 * 1. Create a new review as an authenticated customer (to ensure a review exists
 *    to be commented on).
 * 2. Attempt to create a comment on the review WITHOUT being authenticated
 *    (simulate a guest/unauthenticated user – e.g., with empty/no Authorization
 *    header).
 * 3. Expect an authentication/authorization error and confirm that no comment is
 *    created.
 *
 * Edge Case:
 *
 * - Ensure even a valid comment body with all required fields filled does not
 *   bypass authentication requirements.
 */
export async function test_api_aimall_backend_test_fail_create_comment_without_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a review as authenticated user
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Sample Review Title",
        body: "Sample review body.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 2: Remove Authorization from the connection for guest/unauthenticated simulation
  const unauthenticatedConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete unauthenticatedConnection.headers["Authorization"];

  // Step 2.5: Prepare the comment body
  const commentBody = {
    review_id: review.id,
    body: "Test comment as guest",
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;

  // Step 3: Attempt to create the comment and expect an error
  await TestValidator.error("guest cannot create comment")(() =>
    api.functional.aimall_backend.customer.reviews.comments.create(
      unauthenticatedConnection,
      {
        reviewId: review.id,
        body: commentBody,
      },
    ),
  );
}
