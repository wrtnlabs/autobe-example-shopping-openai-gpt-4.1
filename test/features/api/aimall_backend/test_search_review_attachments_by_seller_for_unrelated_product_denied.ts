import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that a seller cannot access attachments of a review for a product
 * they do not own (authorization boundary test).
 *
 * Business context: In this e-commerce platform, sellers may only manage
 * attachments (e.g., images, files) belonging to their own product reviews.
 * This test ensures cross-product security: if Seller A tries to access review
 * attachments for Seller B's product, the endpoint MUST reject access
 * (typically 403 Forbidden), preserving seller isolation and data privacy.
 *
 * Steps:
 *
 * 1. Register two sellers (SellerA and SellerB) as two different business
 *    entities.
 * 2. Each seller independently creates a product assigned to themselves (productA
 *    for SellerA, productB for SellerB).
 * 3. Simulate a customer writing a review for productA (owned by SellerA).
 * 4. SellerB attempts to search/filter attachments on the review of productA
 *    (using the PATCH /aimall-backend/seller/reviews/{reviewId}/attachments
 *    endpoint with SellerB's context).
 * 5. Assert the API returns a 403 Forbidden error (authorization error),
 *    confirming correct ownership checks.
 *
 * Implementation Notes:
 *
 * - Since there's no authentication API, we assume the connection object can be
 *   reused but the seller context will be set by each create call (in a real
 *   test, seller would be authenticated before accessing endpoints; here, it's
 *   controlled by the seller_id field on products).
 * - The test will only call API-composable steps and will not use any DTO
 *   fields/functions not defined in the provided material.
 */
export async function test_api_aimall_backend_test_search_review_attachments_by_seller_for_unrelated_product_denied(
  connection: api.IConnection,
) {
  // 1. Register two sellers: SellerA and SellerB
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 2. Each seller independently creates a product
  const productA = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerA.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(productA);

  const productB = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerB.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(productB);

  // 3. Simulate a customer writing a review for productA
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productA.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 4. SellerB attempts to search attachments on the review of productA
  await TestValidator.error(
    "Seller should NOT access attachments of review for another seller's product",
  )(async () => {
    await api.functional.aimall_backend.seller.reviews.attachments.search(
      connection,
      {
        reviewId: review.id,
        body: {}, // Broadest query, focus is on access denial
      },
    );
  });
}
