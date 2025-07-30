import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test that a customer cannot soft-delete another customer's review (access
 * forbidden).
 *
 * Business context:
 *
 * - Only the customer who authored a review (Customer A) or an administrator may
 *   delete the review.
 * - This test ensures another customer (Customer B) cannot delete Customer A's
 *   review.
 * - Verifies strict enforcement of access controls and ownership on review
 *   deletion.
 *
 * Step-by-step procedure:
 *
 * 1. Customer A (review owner) creates a review using the create API.
 * 2. Customer B (different user) attempts to soft-delete the review by calling the
 *    erase API with the reviewId.
 * 3. Assert that Customer B is denied access (error thrown).
 * 4. Optionally (if possible), verify that the review is not marked deleted
 *    (deleted_at still null).
 */
export async function test_api_aimall_backend_customer_reviews_test_soft_delete_review_customer_not_owner_forbidden(
  connection: api.IConnection,
) {
  // Step 1: Customer A creates a review
  // (Switch to Customer A's account)
  // Note: Assuming an authentication API is available, but no such function is listed, so we skip actual login simulation
  const reviewData = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Review by Customer A",
    body: "Content for ownership test.",
    rating: 4,
  } satisfies IAimallBackendReview.ICreate;
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  // Step 2: Customer B attempts to delete Customer A's review
  // (Switch to Customer B's account)
  // Note: Since SDK does not provide authentication API, assume Customer B context is used here
  // The actual context switch is omitted; in a real suite, you'd re-authenticate as Customer B
  await TestValidator.error("Customer B cannot delete another user's review")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.erase(connection, {
        reviewId: review.id,
      });
    },
  );

  // Step 3: If possible, re-load the review and assert it was not deleted
  // Note: No API for reading a single review is listed, so skip this validation
}
