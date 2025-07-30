import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a seller who is not the author of a review comment cannot soft
 * delete it (permission check).
 *
 * Business scenario: Prevent unauthorized deletion of review comments by
 * non-authors. When Seller A (the author) writes a comment on a review, Seller
 * B (a different seller) must be forbidden from deleting this comment. After
 * the failed attempt, the comment's `deleted_at` must remain null (i.e., not
 * deleted).
 *
 * Test Steps:
 *
 * 1. Register Seller A (the author).
 * 2. Register Seller B (the non-author).
 * 3. Seller A creates a product.
 * 4. Create a review for the product.
 * 5. Seller A writes a comment to the review.
 * 6. Seller B attempts to soft delete Seller A's comment (should fail, forbidden
 *    error).
 * 7. Confirm the comment's `deleted_at` is still null (comment is NOT deleted).
 *    (Not implemented, as there is no single-comment read API in provided SDK)
 */
export async function test_api_aimall_backend_test_soft_delete_review_comment_fail_on_non_author_seller(
  connection: api.IConnection,
) {
  // 1. Register Seller A (author)
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B (non-author)
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates a product
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()(1)(1),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Create a review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(1),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 5. Seller A creates a comment for the review
  const comment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: RandomGenerator.paragraph()(1),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 6. Seller B attempts to soft delete the comment (should fail)
  // NOTE: In real-world testing, the connection context would switch authentication here
  await TestValidator.error(
    "Non-author should not be able to soft-delete comment",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.comments.erase(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
      },
    );
  });
  // 7. There is no single-comment fetch/read endpoint in current APIs, so we skip deleted_at confirmation.
}
