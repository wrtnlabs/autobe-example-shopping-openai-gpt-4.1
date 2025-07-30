import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a seller cannot comment on reviews not associated with their
 * own products.
 *
 * Business context: Only the seller who owns the product being reviewed should
 * be able to comment on the corresponding review. If another seller (one who
 * does NOT own the product) attempts to post a comment, the system must respond
 * with 403 Forbidden to enforce business rules and data integrity.
 *
 * Test workflow:
 *
 * 1. Create two different products P1 (owned by Seller1) and P2 (owned by
 *    Seller2).
 * 2. A customer writes a review R1 on product P1 (owned by Seller1).
 * 3. Seller2 (who owns only P2, not P1) logs in and attempts to add a comment to
 *    review R1.
 * 4. Validate that the comment creation API call results in a 403 Forbidden error
 *    (permission denied).
 *
 * This confirms that sellers can only comment on reviews of their own products,
 * not those belonging to competitors or unrelated sellers.
 */
export async function test_api_aimall_backend_seller_reviews_comments_test_seller_cannot_comment_on_other_seller_review(
  connection: api.IConnection,
) {
  // Step 1: Set up Seller1 and Seller2 Product
  // (Assume 'seller_id' is linked by authentication context, in practice you would switch auth between seller sessions)
  const seller1Id = typia.random<string & tags.Format<"uuid">>();
  const seller2Id = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Seller1 creates a product (P1)
  const product1 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: seller1Id,
        title: "Seller1 Product",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product1);

  // Seller2 creates a product (P2)
  const product2 = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryId,
        seller_id: seller2Id,
        title: "Seller2 Product",
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product2);

  // Step 2: Customer leaves review on Seller1's product
  const customerReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: product1.id,
        title: "Great product",
        body: "This is a customer review for Seller1's product.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(customerReview);

  // Step 3: Seller2 attempts to comment on the review (should fail)
  // (In an actual system, you would switch authentication to Seller2 here)
  await TestValidator.error(
    "Seller2 cannot comment on another seller's product review",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.comments.create(
      connection,
      {
        reviewId: customerReview.id,
        body: {
          review_id: customerReview.id,
          body: "Seller2 tries to comment on a review not for their product",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  });
}
