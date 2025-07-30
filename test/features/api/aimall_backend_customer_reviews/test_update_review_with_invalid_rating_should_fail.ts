import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate the rejection of review rating updates outside the allowed range
 * (1-5).
 *
 * This E2E test verifies that the review update API enforces business rules on
 * the 'rating' field, rejecting updates that attempt to set the rating below 1
 * or above 5.
 *
 * Steps:
 *
 * 1. Create a valid review (rating=5) and capture its id for update attempts.
 * 2. Attempt to update the review's rating to 0 (below valid range). Expect
 *    validation failure.
 * 3. Attempt to update the review's rating to 6 (above valid range). Expect
 *    validation failure. Both error scenarios are checked using
 *    TestValidator.error. No type safety is bypassed. All DTOs and API calls
 *    are taken from the provided definitions, and typing/validation are
 *    strictly preserved.
 */
export async function test_api_aimall_backend_customer_reviews_test_update_review_with_invalid_rating_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a valid review to obtain reviewId for update attempts
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Good product",
        body: "Nice and useful.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Attempt to update rating to 0 (invalid: below allowed range)
  await TestValidator.error(
    "rating below allowed (0) triggers validation error",
  )(() =>
    api.functional.aimall_backend.customer.reviews.update(connection, {
      reviewId: review.id,
      body: {
        rating: 0,
      } satisfies IAimallBackendReview.IUpdate,
    }),
  );

  // 3. Attempt to update rating to 6 (invalid: above allowed range)
  await TestValidator.error(
    "rating above allowed (6) triggers validation error",
  )(() =>
    api.functional.aimall_backend.customer.reviews.update(connection, {
      reviewId: review.id,
      body: {
        rating: 6,
      } satisfies IAimallBackendReview.IUpdate,
    }),
  );
}
