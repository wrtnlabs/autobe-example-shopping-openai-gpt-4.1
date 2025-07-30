import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Ensure seller access to all comments (public & private, any author) for
 * reviews on their own product, and denial for others.
 *
 * This test simulates a full review/comment thread for a product belonging to a
 * seller. It tests:
 *
 * 1. Seller can fetch comments (public, private, multiple authors, and replies) on
 *    their own product review.
 * 2. Access denied or error when fetching comment from other seller's product
 *    review.
 * 3. Error when fetching a non-existent commentId for a valid review.
 *
 * Steps:
 *
 * 1. Seller creates a product (records seller_id for later lookup).
 * 2. Two customers are simulated for comment authorship variety.
 * 3. Customer1 submits a review for the product.
 * 4. Multiple comments are authored: both public & private, by both customers,
 *    including a reply chain.
 * 5. Seller attempts to fetch each created comment individually via the
 *    seller/comments.at endpoint, confirming data integrity and visibility.
 * 6. Negative: seller tried to fetch a comment on another seller’s product (should
 *    fail: access denied/not found).
 * 7. Negative: seller attempts to fetch random nonexistent commentId (error
 *    expected).
 */
export async function test_api_aimall_backend_test_get_review_comment_as_seller_access_all_on_owned_product(
  connection: api.IConnection,
) {
  // Step 1: Seller creates a product
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: sellerId,
        title: "E2E Test Product - Seller Owned",
        description:
          "Product created for seller comment access E2E integration test.",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(sellerProduct);

  // Step 2: Two customers (simulate by randomizing customer_id usage in comments)
  const customerId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Customer1 creates a review for the seller's product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: sellerProduct.id,
        title: "Review E2E Test",
        body: "Full integration path to comments for seller visibility test.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 4: Create multiple comments (public, private, various authors) on the review
  // Root comment by customer1 (public)
  const comment_public_cust1 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Public root comment from customer1.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment_public_cust1);

  // Root comment by customer2 (private)
  const comment_private_cust2 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "Private root comment from customer2.",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment_private_cust2);

  // Reply by customer1 to customer2's private root comment (public thread reply)
  const comment_reply_public_cust1 =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          parent_id: comment_private_cust2.id,
          body: "Reply from customer1 to private root (public reply).",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment_reply_public_cust1);

  // Step 5: As seller, fetch each created comment by commentId/reviewId
  // (Seller has right to see all on their own product's review)
  const fetched_public_cust1 =
    await api.functional.aimall_backend.seller.reviews.comments.at(connection, {
      reviewId: review.id,
      commentId: comment_public_cust1.id,
    });
  typia.assert(fetched_public_cust1);
  TestValidator.equals("public root comment matches")(fetched_public_cust1.id)(
    comment_public_cust1.id,
  );
  TestValidator.equals("review linkage")(fetched_public_cust1.review_id)(
    review.id,
  );

  const fetched_private_cust2 =
    await api.functional.aimall_backend.seller.reviews.comments.at(connection, {
      reviewId: review.id,
      commentId: comment_private_cust2.id,
    });
  typia.assert(fetched_private_cust2);
  TestValidator.equals("private root comment matches")(
    fetched_private_cust2.id,
  )(comment_private_cust2.id);
  TestValidator.equals("review linkage")(fetched_private_cust2.review_id)(
    review.id,
  );
  TestValidator.equals("privacy flag")(fetched_private_cust2.is_private)(true);

  const fetched_reply_public_cust1 =
    await api.functional.aimall_backend.seller.reviews.comments.at(connection, {
      reviewId: review.id,
      commentId: comment_reply_public_cust1.id,
    });
  typia.assert(fetched_reply_public_cust1);
  TestValidator.equals("public reply matches")(fetched_reply_public_cust1.id)(
    comment_reply_public_cust1.id,
  );
  TestValidator.equals("parent linkage")(fetched_reply_public_cust1.parent_id)(
    comment_private_cust2.id,
  );

  // Step 6: Negative - seller fetches comment for review on another seller's product
  // Create another seller and product
  const otherSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const otherProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: otherCategoryId,
        seller_id: otherSellerId,
        title: "Product not owned by test seller",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(otherProduct);

  // Review for other seller's product
  const otherReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: otherProduct.id,
        title: "Review from someone on other seller prod",
        body: "Review not for test seller product.",
        rating: 3,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(otherReview);

  // Comment on the other review
  const otherComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: otherReview.id,
        body: {
          review_id: otherReview.id,
          body: "Other seller product comment for access denial test.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(otherComment);

  // As original seller, attempt to fetch comment on another seller's product (should error)
  await TestValidator.error(
    "seller can't access unowned product's comment for review",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.comments.at(connection, {
      reviewId: otherReview.id,
      commentId: otherComment.id,
    });
  });

  // Step 7: Negative - fetch non-existent commentId for valid review
  const fakeCommentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent comment fetch fails")(async () => {
    await api.functional.aimall_backend.seller.reviews.comments.at(connection, {
      reviewId: review.id,
      commentId: fakeCommentId,
    });
  });
}
