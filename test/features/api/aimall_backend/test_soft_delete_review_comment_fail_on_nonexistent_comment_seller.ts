import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate that a seller attempting to soft delete a review comment using a
 * non-existent commentId results in a not found error.
 *
 * Business importance: Ensures that the backend properly rejects deletion
 * attempts targeting non-existent comments, protecting data integrity and user
 * expectations.
 *
 * Step-by-step process:
 *
 * 1. Register a valid seller (administrator onboarding endpoint).
 * 2. Create a product for the seller (using the products endpoint).
 * 3. Create a product review as customer (for the product, no comment is created).
 * 4. Attempt to soft delete a comment on the review as the seller, but use a
 *    random (non-existent) commentId.
 *
 *    - Confirm that the API returns an error indicating not found.
 */
export async function test_api_aimall_backend_test_soft_delete_review_comment_fail_on_nonexistent_comment_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller (via administrator onboarding endpoint)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for this seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create a review for the product (customer action)
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: "Excellent!",
        body: RandomGenerator.paragraph()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 4. Attempt to erase (soft-delete) a non-existent comment on the review (by seller)
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Soft delete on non-existent comment must fail")(
    async () => {
      await api.functional.aimall_backend.seller.reviews.comments.erase(
        connection,
        {
          reviewId: review.id,
          commentId: nonExistentCommentId,
        },
      );
    },
  );
}
