import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E Test: Seller can post a comment on a customer review for their product
 *
 * Validates that an authenticated seller can create a comment on a review for
 * one of their products. Ensures the created comment entity links correctly to
 * the review, the comment body is stored, audit fields (created_at/updated_at)
 * exist, and that the comment is not deleted. This confirms cross-role
 * commenting permissions for seller->review.
 *
 * Steps:
 *
 * 1. Create a product as the seller
 * 2. Register a review for that product (by customer)
 * 3. Seller posts a comment on the review
 * 4. Validate linking, content, and audit fields
 */
export async function test_api_aimall_backend_test_seller_creates_comment_on_review_success(
  connection: api.IConnection,
) {
  // 1. Create a product as seller
  const seller_id = typia.random<string & tags.Format<"uuid">>(); // Simulate current seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id,
        title: RandomGenerator.paragraph()(10),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Create a review for the product (as customer)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Seller posts a comment on the review
  const commentBody = "Thank you for your feedback!";
  const comment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: commentBody,
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 4. Validate linkage, content, and audit fields
  TestValidator.equals("comment.review_id matches")(comment.review_id)(
    review.id,
  );
  TestValidator.equals("comment body matches")(comment.body)(commentBody);
  TestValidator.predicate("audit fields exist")(
    !!comment.created_at && !!comment.updated_at,
  );
  TestValidator.equals("not deleted")(comment.deleted_at)(null);
}
