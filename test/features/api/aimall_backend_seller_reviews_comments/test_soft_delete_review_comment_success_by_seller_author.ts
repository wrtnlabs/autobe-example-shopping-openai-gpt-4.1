import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that a seller can soft delete their own review comment (sets deleted_at
 * timestamp).
 *
 * Business context:
 *
 * - Soft deleting review comments supports audit compliance while hiding deleted
 *   records from standard comment/review feeds.
 * - Only the comment's author (seller) or authorized accounts should be able to
 *   perform soft delete.
 * - Soft delete means the underlying comment entity remains in DB, with
 *   deleted_at timestamp set.
 *
 * Test Steps:
 *
 * 1. Register a seller using the admin endpoint.
 * 2. Have the seller create a product.
 * 3. Simulate a customer submitting a review for that product.
 * 4. (As the seller) create a comment on the above review.
 * 5. (As the seller) erase (soft delete) that comment.
 * 6. Validate that the comment entity is still present but has deleted_at set (if
 *    possible via query), OR that the operation completes successfully (since
 *    the erase endpoint is void, only call result and lack of error can be
 *    checked).
 *
 * Note: Step 6 cannot fully check the deleted_at property without an additional
 * GET/comments endpoint, which is not present. Thus, final validation is
 * limited to erase call's completion, and no error thrown.
 */
export async function test_api_aimall_backend_seller_reviews_comments_test_soft_delete_review_comment_success_by_seller_author(
  connection: api.IConnection,
) {
  // 1. Register the seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a product associated to this seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Simulate customer submitting a review for the product
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 4. (As seller) create a comment on that review
  const commentInput: IAimallBackendComment.ICreate = {
    post_id: null,
    review_id: review.id,
    parent_id: null,
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      { reviewId: review.id, body: commentInput },
    );
  typia.assert(comment);

  // 5. (As seller) erase (soft delete) the comment
  await api.functional.aimall_backend.seller.reviews.comments.erase(
    connection,
    { reviewId: review.id, commentId: comment.id },
  );
  // Since erase returns void, no assertion required. Success if no error is thrown
}
