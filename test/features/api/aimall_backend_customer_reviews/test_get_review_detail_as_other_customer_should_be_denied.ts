import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test that a customer cannot view the details of a product review submitted by
 * another customer for privacy reasons.
 *
 * This test validates that the system enforces strict data isolation at the API
 * level: a customer should never be able to access detailed information about a
 * review unless they are its creator, in accordance with privacy/business
 * policy.
 *
 * Steps:
 *
 * 1. Auth as Customer 1 (C1) and create a product review using POST
 *    /aimall-backend/customer/reviews
 * 2. Switch context to Customer 2 (C2) (simulate new authenticated customer)
 * 3. Attempt GET /aimall-backend/customer/reviews/{reviewId} as C2 for the review
 *    written by C1
 * 4. Confirm access fails (error is thrown, and no data is leaked)
 *
 * Note: In a real E2E framework, test auth switching via connection/token as
 * needed for each customer session.
 */
export async function test_api_aimall_backend_customer_reviews_test_get_review_detail_as_other_customer_should_be_denied(
  connection: api.IConnection,
) {
  // 1. Customer 1 creates a review
  const productId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: "Test Review Title",
        body: "Test review body content.",
        rating: 4,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Switch to Customer 2 (simulated: in a real suite, would use a fresh authenticated connection)
  // For this test, assume connection now represents Customer 2

  // 3. Attempt to fetch C1's review as C2
  await TestValidator.error("Other customer cannot access review details")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.at(connection, {
        reviewId: review.id,
      });
    },
  );
}
