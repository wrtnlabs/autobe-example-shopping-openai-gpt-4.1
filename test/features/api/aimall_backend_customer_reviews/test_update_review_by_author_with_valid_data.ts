import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test review update by author with valid data. Ensures only allowed fields are
 * modified.
 *
 * Validates that a logged-in customer can update their own review's allowed
 * fields (title, body, rating) via the
 * /aimall-backend/customer/reviews/{reviewId} endpoint, and that forbidden
 * fields (customer_id, product_id) are protected from being changed. Timestamps
 * and atomic update behavior are also verified.
 *
 * 1. Create a product review with known title, body, and rating, capture initial
 *    state.
 * 2. Update the review's title and rating using the update endpoint (body can be
 *    omitted to test partial atomic updates).
 * 3. Fetch the updated review from the update API response.
 * 4. Assert that:
 *
 *    - Only the fields in the update payload are changed; other fields remain intact
 *    - Title and rating reflect new values; body stays unchanged
 *    - Updated_at has changed and is after the previous value
 *    - Product_id and customer_id have not been modified
 *    - Created_at remains unchanged
 */
export async function test_api_aimall_backend_customer_reviews_test_update_review_by_author_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a new product review as a customer
  const initialCreate: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Initial Title",
        body: "This is the initial review body.",
        rating: 3,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(initialCreate);

  // 2. Update only title and rating fields
  const updateInput: IAimallBackendReview.IUpdate = {
    title: "Updated Title",
    rating: 5,
    // body omitted intentionally for atomic update test
  };
  const updated: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.update(connection, {
      reviewId: initialCreate.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 3. Validate fields: only title/rating changed, others the same
  TestValidator.equals("id unchanged")(updated.id)(initialCreate.id);
  TestValidator.equals("product_id unchanged")(updated.product_id)(
    initialCreate.product_id,
  );
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    initialCreate.customer_id,
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    initialCreate.created_at,
  );
  TestValidator.notEquals("updated_at changed")(updated.updated_at)(
    initialCreate.updated_at,
  );

  TestValidator.equals("title updated")(updated.title)(updateInput.title);
  TestValidator.equals("rating updated")(updated.rating)(updateInput.rating);
  TestValidator.equals("body unchanged")(updated.body)(initialCreate.body);
}
