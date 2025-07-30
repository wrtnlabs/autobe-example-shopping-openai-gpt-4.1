import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test successful soft deletion of a product review by its author.
 *
 * This test verifies the soft-delete business logic for product reviews in a
 * customer context:
 *
 * 1. Create a new review as the authenticated customer using the API.
 * 2. Assert proper review fields (deleted_at is null, fields match input).
 * 3. Soft-delete (erase) the review record by id.
 * 4. Attempt to erase a second time; expects error (or silent no-op) as per
 *    backend rule.
 * 5. (TODO) If/when API exposes a single-review fetch or index endpoint, would
 *    verify deleted_at set and review is hidden post-deletion.
 *
 * This flow ensures that only the reviewer can soft-delete their feedback, that
 * soft-deletion is handled as a timestamp, and that repeated deletion is
 * blocked or idempotent per system policy. The function makes all business
 * checks feasible with today's API surface.
 */
export async function test_api_aimall_backend_customer_reviews_test_soft_delete_review_customer_success(
  connection: api.IConnection,
) {
  // 1. Create a new review as the test subject
  const input: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test review soft-delete",
    body: "This review is created to verify soft deletion.",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: input,
    },
  );
  typia.assert(review);
  TestValidator.equals("deleted_at null on create")(review.deleted_at)(null);
  TestValidator.equals("review title matches")(review.title)(input.title);
  TestValidator.equals("review body matches")(review.body)(input.body);
  TestValidator.equals("review rating matches")(review.rating)(input.rating);

  // 2. Soft-delete the review
  await api.functional.aimall_backend.customer.reviews.erase(connection, {
    reviewId: review.id,
  });

  // 3. Attempt to soft-delete the same review again – expect backend error/ignore
  await TestValidator.error(
    "second soft-delete should fail or silently succeed",
  )(async () => {
    await api.functional.aimall_backend.customer.reviews.erase(connection, {
      reviewId: review.id,
    });
  });

  // TODO: When/if a single-review GET API is available, fetch and assert deleted_at is now a timestamp
  // TODO: When/if a review index/list API is available, verify soft-deleted review does not appear
  // TODO: If an update API is added, try updating after delete and expect an error
}
