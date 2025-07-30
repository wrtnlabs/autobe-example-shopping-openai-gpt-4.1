import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that customer permissions are properly enforced when listing
 * comments for reviews.
 *
 * Business context: This test ensures that private comments attached to product
 * reviews are visible only to their owners, and other customers cannot retrieve
 * or see private comments not belonging to them. This is critical to prevent
 * data leakage of sensitive comment threads between different customers.
 *
 * Workflow:
 *
 * 1. Customer A (represented by the provided connection) creates a review for a
 *    random product.
 * 2. Customer A creates a private comment on their own review.
 * 3. The function retrieves the list of comments for that review via the API.
 * 4. As the API suite does not support switching between different customer
 *    accounts (no customer auth endpoints), we check that all is_private
 *    comments visible in this context belong to the review owner.
 *
 * Defensive note: If test infrastructure is enhanced with user switching/auth
 * APIs in future, extend this test to assert that Customer B cannot see
 * Customer A's private comments when fetching the review's comment list.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_list_review_comments_customer_permissions_enforced(
  connection: api.IConnection,
) {
  // Step 1: Customer A creates a review for a random product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Permission Enforcement Review",
        body: "Ensuring private comment permissions.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // Step 2: Customer A adds a private comment to their review
  const privateComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "This comment is private and for test validation purposes.",
          is_private: true,
          post_id: null,
          review_id: review.id,
          parent_id: null,
        },
      },
    );
  typia.assert(privateComment);

  // Step 3: Retrieve all comments for the review
  const commentsPage =
    await api.functional.aimall_backend.customer.reviews.comments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(commentsPage);

  // Step 4: For each private comment summary, assert it belongs to review owner
  if (commentsPage?.data) {
    for (const c of commentsPage.data) {
      if (c.is_private) {
        TestValidator.equals("private comment belongs to review owner")(
          c.customer_id,
        )(review.customer_id);
      }
    }
  }
  // NOTE: Actual cross-customer visibility checks require user switching APIs, not available here.
}
