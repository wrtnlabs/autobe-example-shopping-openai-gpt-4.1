import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a customer who authored a review comment can successfully
 * perform a soft delete operation (logical deletion).
 *
 * This test simulates the entire customer comment lifecycle, ensuring:
 *
 * - Registration of a customer and a seller (for product context)
 * - Creation of a product by the seller
 * - Submission of a product review by the customer
 * - Creation of a comment on the review by the same customer
 * - Soft-deletion of the comment by the same customer using the DELETE endpoint
 *
 * Although direct verification of the "deleted_at" status after deletion cannot
 * be performed due to lack of a fetch/list API, this function validates the
 * full workflow and ensures type/documentation compliance.
 *
 * Steps performed:
 *
 * 1. Register a customer (future comment author)
 * 2. Register a seller (simulated, since only customers can be created; assumed
 *    sufficient for test isolation)
 * 3. Create a product as the seller
 * 4. Create a review for this product as the customer
 * 5. Post a comment to the review as the customer
 * 6. Confirm the comment's "deleted_at" field is null before deletion
 * 7. Soft-delete the comment via the DELETE endpoint
 * 8. (Comment fetch/list not available; thus, post-delete confirmation is not
 *    implemented)
 */
export async function test_api_aimall_backend_test_soft_delete_review_comment_by_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (comment author)
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Register a new seller (simulate with customer creation)
  const seller: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(seller);

  // 3. Seller creates a product
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 4. Customer creates a review for that product
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 5. Customer submits a comment on the review
  const comment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          body: "This is a comment for test soft-delete.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("deleted_at null before delete")(comment.deleted_at)(
    null,
  );

  // 6. Soft-delete the review comment (logical deletion; sets deleted_at field)
  await api.functional.aimall_backend.customer.reviews.comments.erase(
    connection,
    {
      reviewId: review.id,
      commentId: comment.id,
    },
  );

  // 7. Post-deletion verification of deleted_at is not possible (no read/list API provided).
}
