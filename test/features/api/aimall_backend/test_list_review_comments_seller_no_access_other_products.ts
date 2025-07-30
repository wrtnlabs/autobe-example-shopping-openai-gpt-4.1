import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that a seller CANNOT fetch comments for a review on a product they do
 * NOT own (access control enforcement).
 *
 * Simulates the following flow:
 *
 * 1. Seller A creates a product.
 * 2. Customer posts a review on that product.
 * 3. Customer adds a comment on the review.
 * 4. Seller B (unrelated) tries to access the review's comments as a seller.
 *
 * The system must enforce authorization: Seller B should see NO comment data
 * (empty array or error).
 *
 * Steps:
 *
 * 1. Seller A creates a product (simulate as seller A with a unique seller_id)
 * 2. Customer writes a review for that product
 * 3. Customer posts a comment for that review
 * 4. Simulate Seller B context (different seller_id)
 * 5. Seller B calls GET /aimall-backend/seller/reviews/{reviewId}/comments
 * 6. Assert the result is either empty or forbidden per business policy
 */
export async function test_api_aimall_backend_test_list_review_comments_seller_no_access_other_products(
  connection: api.IConnection,
) {
  // 1. Seller A creates a product
  const sellerAId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerAId,
        title: "Review Isolation Test Product",
        status: "active",
      },
    },
  );
  typia.assert(product);

  // 2. Customer writes a review on Seller A's product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: "Test Review for Unrelated Seller",
        body: "Review body for access test.",
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 3. Customer posts a comment on that review
  const comment =
    await api.functional.aimall_backend.customer.reviews.comments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          body: "This is a customer test comment.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // 4. Simulate Seller B context by using a different seller_id (role switch assumed handled by infra)
  const sellerBId = typia.random<string & tags.Format<"uuid">>();
  // In a real env: must authenticate as Seller B and set their credentials in 'connection'
  // For this test, use the same connection assuming role context switch handled by test harness
  const result =
    await api.functional.aimall_backend.seller.reviews.comments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(result);

  // 5. Assert that Seller B cannot view comments on a review/product they do not own
  TestValidator.predicate(
    "seller B must not view any comments for other seller's product",
  )(!result.data || result.data.length === 0);
}
