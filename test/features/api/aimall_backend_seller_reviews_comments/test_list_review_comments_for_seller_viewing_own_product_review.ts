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
 * Validate that a seller can see all comments (public and private) on a review
 * written about their own product.
 *
 * This test ensures the following workflow:
 *
 * 1. A seller creates a product.
 * 2. A customer submits a review for the product.
 * 3. The customer posts both a public and a private comment to the review.
 * 4. The seller queries the review's comments via the seller comments endpoint.
 * 5. The seller should see all comments left on the review, including private ones
 *    (since this is their product’s review).
 * 6. The test asserts the presence and properties of each comment (body, privacy,
 *    author).
 *
 * Steps:
 *
 * 1. Seller creates a product.
 * 2. Customer submits a review for the product.
 * 3. Customer posts one public and one private comment.
 * 4. Seller queries the comments and validates all are visible and properties are
 *    correct.
 */
export async function test_api_aimall_backend_seller_reviews_comments_test_list_review_comments_for_seller_viewing_own_product_review(
  connection: api.IConnection,
) {
  // --- 1. Seller creates a product ---
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  const sellerCategoryId: string = typia.random<string & tags.Format<"uuid">>();
  // Create product as seller (simulate seller context is authenticated)
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: sellerCategoryId,
        seller_id: sellerId,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.paragraph()(2),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // --- 2. Customer submits review for product ---
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(2),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // --- 3. Customer posts public and private comments to the review ---
  const commentBodies = [
    { body: "This is a public comment", is_private: false },
    { body: "This is a private comment", is_private: true },
  ];
  const createdComments: IAimallBackendComment[] = [];
  for (const { body, is_private } of commentBodies) {
    const comment =
      await api.functional.aimall_backend.customer.reviews.comments.create(
        connection,
        {
          reviewId: review.id,
          body: {
            review_id: review.id,
            body,
            is_private,
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // --- 4. Seller queries all comments on the review ---
  const page =
    await api.functional.aimall_backend.seller.reviews.comments.index(
      connection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(page);
  TestValidator.predicate("should contain both comments")(
    Array.isArray(page.data) && page.data.length >= 2,
  );

  // --- 5. Validate both comments exist and details match ---
  for (const expected of createdComments) {
    const found = (page.data ?? []).find(
      (c) =>
        c && c.body === expected.body && c.is_private === expected.is_private,
    );
    TestValidator.predicate(
      `comment '${expected.body}' is present and privacy flag matches`,
    )(!!found);
    if (found) {
      // Optionally check other details, e.g. customer_id matches (if present in summary)
      if (found.customer_id && expected.customer_id)
        TestValidator.equals("customer id matches")(found.customer_id)(
          expected.customer_id,
        );
      TestValidator.equals("body matches")(found.body)(expected.body);
      TestValidator.equals("privacy flag matches")(found.is_private)(
        expected.is_private,
      );
    }
  }
}
