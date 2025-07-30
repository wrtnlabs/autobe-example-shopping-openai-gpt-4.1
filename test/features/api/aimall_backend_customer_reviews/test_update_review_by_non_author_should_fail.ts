import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate that only the original author of a review can update it, and not
 * other customers.
 *
 * This test simulates two distinct customers and ensures a security policy is
 * enforced:
 *
 * 1. Customer 1 creates a product review (using the
 *    /aimall-backend/customer/reviews POST API).
 * 2. Customer 2 (a different user) attempts to update that review (using the
 *    /aimall-backend/customer/reviews/{reviewId} PUT API).
 * 3. Expect the API to reject the operation with an authorization/ownership error
 *    (no update allowed unless the review belongs to the logged-in customer).
 *
 * Steps:
 *
 * 1. (PRECONDITION) Authenticate/simulate Customer 1 in the connection context.
 * 2. Create a new review as Customer 1, store its ID.
 * 3. Switch simulation/authentication to Customer 2 in the connection context.
 * 4. Attempt to update the prior review as Customer 2 (should be denied).
 * 5. Validate that the operation is denied (expect error via TestValidator.error).
 *
 * This test enforces the rule: "No customer can update reviews they do not
 * own."
 */
export async function test_api_aimall_backend_customer_reviews_test_update_review_by_non_author_should_fail(
  connection: api.IConnection,
) {
  // -----------------------
  // 1. Simulate/Authenticate as Customer 1
  // (Assume test infra can set/toggle user identity in the connection context. Real login API not in scope.)

  // 2. Create a review as Customer 1
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "First review title",
        body: "Customer 1's original review.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // -----------------------
  // 3. Simulate/Authenticate as Customer 2
  // (In actual E2E, this may require a login/discrete auth call; here, assume test env provides switch.)

  // 4. Attempt update as Customer 2
  await TestValidator.error(
    "Non-author customer cannot update another's review",
  )(async () => {
    await api.functional.aimall_backend.customer.reviews.update(connection, {
      reviewId: review.id,
      body: {
        title: "Malicious update attempt",
        body: "Trying to overwrite another user's content.",
        rating: 1,
      } satisfies IAimallBackendReview.IUpdate,
    });
  });

  // (Optionally: If there were a review read/query endpoint, could confirm no accidental modification.)
}
