import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that a seller author can update their own product review comment.
 *
 * This test simulates the full flow: registering a seller, adding a product,
 * creating a review for that product, adding a comment as the seller to the
 * review, and then updating that comment (body and privacy).
 *
 * Validates that:
 *
 * - Only mutable fields (body, is_private) change,
 * - All other fields remain as before,
 * - The updated_at timestamp is advanced,
 * - Entity links (id, review_id, created_at, deleted_at) are stable,
 * - The update endpoint accurately applies changes for an authenticated author.
 *
 * Steps:
 *
 * 1. Register a seller account
 * 2. Register a product for the seller
 * 3. Create a customer review for that product
 * 4. Seller creates a comment on the review
 * 5. Update the comment body and privacy via the update endpoint
 * 6. Assert output field changes and timestamp advancement
 */
export async function test_api_aimall_backend_test_update_review_comment_success_by_author_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerCreate: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerCreate,
      },
    );
  typia.assert(seller);

  // 2. Register a product by this seller
  const productCreate: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(3),
    description: RandomGenerator.paragraph()(2),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 3. Create a review for the product (simulated as customer)
  const reviewCreate: IAimallBackendReview.ICreate = {
    product_id: product.id,
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.paragraph()(2),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewCreate,
    },
  );
  typia.assert(review);

  // 4. Seller creates a comment on the review
  const commentCreate: IAimallBackendComment.ICreate = {
    review_id: review.id,
    body: "Initial seller response.",
    is_private: false,
  };
  const comment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: commentCreate,
      },
    );
  typia.assert(comment);

  // 5. Seller updates body and privacy of their own comment
  const new_body = "Updated seller comment: issue has been resolved.";
  const new_privacy = true;
  const before_updated_at = comment.updated_at;
  const updated_comment =
    await api.functional.aimall_backend.seller.reviews.comments.update(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
        body: {
          body: new_body,
          is_private: new_privacy,
        },
      },
    );
  typia.assert(updated_comment);

  // 6. Assertions: only body/is_private/updated_at should change
  TestValidator.equals("comment id")(updated_comment.id)(comment.id);
  TestValidator.equals("review id")(updated_comment.review_id)(
    comment.review_id,
  );
  TestValidator.equals("new body")(updated_comment.body)(new_body);
  TestValidator.equals("privacy flag")(updated_comment.is_private)(new_privacy);
  TestValidator.predicate("updated_at advanced")(
    new Date(updated_comment.updated_at).getTime() >
      new Date(before_updated_at).getTime(),
  );
  TestValidator.equals("created_at unchanged")(updated_comment.created_at)(
    comment.created_at,
  );
  TestValidator.equals("deleted_at unchanged")(
    updated_comment.deleted_at ?? null,
  )(comment.deleted_at ?? null);
}
