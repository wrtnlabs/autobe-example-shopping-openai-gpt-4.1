import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate rejection of invalid update inputs for seller review comments.
 *
 * This test ensures that the API enforces schema and business rules for
 * updating a seller's review comment. Specifically, it checks that the update
 * endpoint correctly rejects requests with malformed data—for example, an empty
 * string for the comment body (when nonempty is required).
 *
 * Business context: In this workflow, we simulate a seller who needs to update
 * their own comment on a product review, but passes illegal values, triggering
 * validation or type errors by the API. Proper rejection and error signaling
 * must occur for robust schema enforcement.
 *
 * Test Steps:
 *
 * 1. Use admin endpoint to create a seller account
 * 2. Register a product so that review/comment context is available
 * 3. Create a review as a customer for that product
 * 4. Create a comment (as the seller) on the review
 * 5. Attempt to update the comment with an empty body => expect error
 *
 * This validates both business logic (nonempty comment) and input schema
 * enforcement by the API.
 */
export async function test_api_aimall_backend_seller_reviews_comments_test_update_review_comment_fail_on_invalid_input(
  connection: api.IConnection,
) {
  // 1. Create a seller account
  const sellerInput = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Register a product (for review context)
  const productInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(8),
    description: RandomGenerator.paragraph()(16),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create a review (simulate customer feedback for product)
  const reviewInput = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.paragraph()(12),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. Create a comment as the seller on the review
  const commentInput = {
    review_id: review.id,
    body: "Thank you for your review!",
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      { reviewId: review.id, body: commentInput },
    );
  typia.assert(comment);

  // 5. Attempt to update with empty body (should fail)
  await TestValidator.error("empty body in comment update should fail")(
    async () => {
      await api.functional.aimall_backend.seller.reviews.comments.update(
        connection,
        {
          reviewId: review.id,
          commentId: comment.id,
          body: { body: "" },
        },
      );
    },
  );
}
