import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test updating a review comment by a seller when the comment does not exist.
 *
 * This test ensures the API returns a not found error when attempting to update
 * a nonexistent comment on a valid review. It validates business logic for
 * comment existence and access control.
 *
 * Step-by-step process:
 *
 * 1. Register a new seller via administrator onboarding endpoint.
 * 2. As the seller, create a new product (for review context).
 * 3. Create a review on the product (to provide review context).
 * 4. Attempt to update a comment on this review with a random (non-existing)
 *    commentId as the seller.
 * 5. Assert that the API call throws an error (404 not found or generic not found
 *    error).
 */
export async function test_api_aimall_backend_test_update_review_comment_fail_on_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "pending",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create product as the seller
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create a review for the product (customer context simulated for setup)
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

  // 4. Attempt to update a comment on this review with a non-existent commentId
  const fakeCommentId: string = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("should return not found for non-existent comment")(
    async () => {
      await api.functional.aimall_backend.seller.reviews.comments.update(
        connection,
        {
          reviewId: review.id,
          commentId: fakeCommentId,
          body: {
            body: "Updated body for non-existent comment.",
            is_private: false,
          } satisfies IAimallBackendComment.IUpdate,
        },
      );
    },
  );
}
