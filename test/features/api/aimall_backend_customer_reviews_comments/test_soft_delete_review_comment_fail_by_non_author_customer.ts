import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test soft deletion of a review comment by a non-author customer.
 *
 * This test verifies that only the author of a review comment is permitted to
 * delete (soft-delete) their own comment. Business rule: Deletion (soft-delete)
 * must fail for any customer except the comment's author.
 *
 * Process:
 *
 * 1. Register Customer A (the author of the comment).
 * 2. Register Customer B (who will attempt the unauthorized deletion).
 * 3. Create a product as review/test context (seller is random).
 * 4. Customer A writes a review for the product.
 * 5. Customer A creates a comment on that review.
 * 6. Customer B attempts to soft-delete Customer A's comment. This should fail
 *    with a permission/forbidden error.
 *
 * Pre/post-conditions:
 *
 * - The comment's deleted_at field must remain unchanged.
 * - Unable to check deleted_at after failed deletion (no read API for comments),
 *   so just enforce error.
 * - Authentication context switching is assumed by the test infra, but a
 *   placeholder is provided for where to switch users if the system requires
 *   it.
 */
export async function test_api_aimall_backend_customer_reviews_comments_test_soft_delete_review_comment_fail_by_non_author_customer(
  connection: api.IConnection,
) {
  // 1. Register Customer A (author)
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "pwA12345hash",
        status: "active",
      },
    },
  );
  typia.assert(customerA);

  // 2. Register Customer B (non-author)
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: "pwB12345hash",
        status: "active",
      },
    },
  );
  typia.assert(customerB);

  // 3. Create a product for review context
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: RandomGenerator.paragraph()(10),
        description: RandomGenerator.content()()(30),
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 4. Customer A creates a review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(5),
        body: RandomGenerator.content()()(20),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 5. Customer A creates a comment on the review
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "This is a comment by Customer A.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 6. Switch to Customer B authentication context here if required by your infra.

  // 7. Customer B attempts to soft-delete the comment
  await TestValidator.error("Non-author cannot delete comment")(() =>
    api.functional.aimall_backend.customer.reviews.comments.erase(connection, {
      reviewId: review.id,
      commentId: comment.id,
    }),
  );
  // 8. Cannot check deleted_at due to lack of read endpoint; if it existed, would verify unchanged field.
}
