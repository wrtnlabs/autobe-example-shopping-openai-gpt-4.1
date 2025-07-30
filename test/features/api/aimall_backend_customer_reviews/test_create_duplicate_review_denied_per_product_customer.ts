import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * E2E test for enforcing unique product reviews per customer.
 *
 * This test validates that a customer cannot post multiple reviews for the same
 * product. It performs:
 *
 * 1. Assumes connection is authenticated for a customer (no customer creation/auth
 *    endpoint in SDK).
 * 2. Mocks a product_id for testing (no product creation endpoint in SDK).
 * 3. Posts a first review for the product (should succeed).
 * 4. Attempts to post a second review for the same product as the same customer
 *    (should fail due to uniqueness constraint).
 */
export async function test_api_aimall_backend_customer_reviews_test_create_duplicate_review_denied_per_product_customer(
  connection: api.IConnection,
) {
  // 1. Assume customer auth handled externally (connection is for customer)

  // 2. Mock a product ID (UUID) for testing uniqueness
  const product_id = typia.random<string & tags.Format<"uuid">>();

  // 3. Submit the first review (should succeed)
  const reviewCreate: IAimallBackendReview.ICreate = {
    product_id,
    title: "Great product, I loved it!",
    body: "Performance met expectations and delivery was fast.",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewCreate },
  );
  typia.assert(review);
  TestValidator.equals("review.product_id matches input")(review.product_id)(
    product_id,
  );
  TestValidator.equals("review.rating matches")(review.rating)(5);

  // 4. Attempt a second review for the same product as the same customer (should fail)
  TestValidator.error("Duplicate review attempt must fail")(async () => {
    const secondReview: IAimallBackendReview.ICreate = {
      product_id,
      title: "Trying to add a second review for same product",
      body: "This should trigger uniqueness violation.",
      rating: 3,
    };
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: secondReview,
    });
  });
}
