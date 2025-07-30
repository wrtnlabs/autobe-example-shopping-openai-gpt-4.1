import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test prevention of double soft-delete on a review comment (idempotency and
 * state protection).
 *
 * This scenario simulates a customer who has authored a comment on a product
 * review, soft deletes the comment, then attempts to soft delete it again. The
 * system must reject the second deletion request – confirming correct
 * enforcement of logical state transitions and idempotency for deletions. This
 * ensures that content moderation or user actions cannot re-delete or
 * double-delete an already-soft-deleted comment. Only runtime-level business
 * errors are validated (not compile errors).
 *
 * Steps:
 *
 * 1. Register a customer who is the eventual author and deleter of the comment.
 * 2. Seller context: Create a product for the review.
 * 3. Customer context: Register a review on the product (requires product id).
 * 4. Customer context: Post a comment on the review (requires review id).
 * 5. Customer context: Soft-delete the comment once (should succeed).
 * 6. Customer context: Attempt to soft-delete the same comment again (should fail
 *    with error, confirming idempotency).
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_soft_delete_review_comment_fail_on_already_deleted(
  connection: api.IConnection,
) {
  // 1. Register customer who will author and delete
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register product as a seller (simulate with random ids)
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Product",
        description: "Test Description",
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Customer registers a review for the product
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: "Great!",
        body: "Loved it.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. Customer creates a comment for the review
  const comment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "This is my comment.",
          review_id: review.id,
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 5. First soft delete attempt (should succeed, no error)
  await api.functional.aimall_backend.customer.reviews.comments.erase(
    connection,
    {
      reviewId: review.id,
      commentId: comment.id,
    },
  );

  // 6. Second soft delete should fail, confirming idempotency/protection
  await TestValidator.error(
    "Double delete should fail: cannot re-delete an already deleted comment",
  )(async () => {
    await api.functional.aimall_backend.customer.reviews.comments.erase(
      connection,
      {
        reviewId: review.id,
        commentId: comment.id,
      },
    );
  });
}
