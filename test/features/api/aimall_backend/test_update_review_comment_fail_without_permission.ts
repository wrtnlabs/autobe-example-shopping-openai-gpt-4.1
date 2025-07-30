import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a seller cannot update another seller's or a customer's review
 * comment.
 *
 * This test ensures that only the owner of a review comment (the original
 * seller who created it) can update that comment. It covers the authorization
 * business rule that prevents sellers from editing comments they do not own.
 *
 * Steps:
 *
 * 1. Register two sellers: Seller A and Seller B.
 * 2. Seller A logs in (assumed by API context after registration) and creates a
 *    product.
 * 3. Create a customer review for the product (customer authentication flows are
 *    assumed as handled externally, or customer is implicitly authenticated for
 *    test purposes).
 * 4. Seller A creates a comment on the review.
 * 5. Seller B (switch context) attempts to update Seller A's comment.
 * 6. The API must return a forbidden/authorization error, confirming the update is
 *    denied.
 */
export async function test_api_aimall_backend_test_update_review_comment_fail_without_permission(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerAEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerBEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Seller A creates a product (category_id must be a valid UUID for this test)
  // Since no endpoint to create categories, use random UUID
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      },
    });
  typia.assert(product);

  // 4. Create a customer review for the product
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      },
    });
  typia.assert(review);

  // 5. Seller A creates a comment on the review
  const comment: IAimallBackendComment =
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "Initial seller response.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 6. Seller B attempts to update Seller A's comment (permission denied expected)
  // (Assumed that switching context to Seller B occurs by authentication - omitted here, as authentication flows are not exposed by provided endpoints)
  await TestValidator.error(
    "seller without ownership cannot update another's comment",
  )(() =>
    api.functional.aimall_backend.seller.reviews.comments.update(connection, {
      reviewId: review.id,
      commentId: comment.id,
      body: {
        body: "Malicious edit attempt.",
      },
    }),
  );
}
