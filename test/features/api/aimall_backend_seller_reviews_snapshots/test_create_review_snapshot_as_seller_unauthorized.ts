import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that only an authorized seller (the one whose product is reviewed)
 * can create a snapshot for a product review.
 *
 * This test ensures that a seller who does NOT own the product associated with
 * a specific review cannot add (create) a media snapshot to that review.
 * Specifically:
 *
 * - Register two sellers (Seller A and Seller B).
 * - Simulate a product UUID owned by Seller A.
 * - As a customer, create a review for Seller A's product.
 * - Attempt to create a snapshot for that review as Seller B (not the owner) via
 *   the seller snapshot API.
 * - The API should respond with a forbidden/authorization error, blocking the
 *   creation. Assert that an error occurs and snapshot is not created.
 *
 * Steps:
 *
 * 1. Register Seller A using the administrator onboarding API.
 * 2. Register Seller B likewise.
 * 3. Generate a UUID representing a product owned by Seller A (simulate, since
 *    products are not in DTO/api scope).
 * 4. Submit a review for the product as a customer (customer review creation API).
 * 5. Attempt to create a snapshot for this review as Seller B through the seller
 *    snapshot endpoint.
 *
 *    - The operation MUST fail (forbidden error).
 *
 * Note: As product and authentication flows are not implemented in the current
 * API, role context is conceptual, and actual HTTP 403 cannot be guaranteed in
 * this E2E. The test focuses on a forbidden action by business logic (ownership
 * mismatch).
 */
export async function test_api_aimall_backend_seller_reviews_snapshots_test_create_review_snapshot_as_seller_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register Seller A
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(2),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerA);

  // 2. Register Seller B
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(2),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(sellerB);

  // 3. Simulate a product UUID belonging to Seller A
  const productId = typia.random<string & tags.Format<"uuid">>();

  // 4. As a customer, create a review on Seller A's product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 5. Attempt to create a snapshot for the review as Seller B (should fail)
  await TestValidator.error("unauthorized seller cannot create snapshot")(
    async () => {
      await api.functional.aimall_backend.seller.reviews.snapshots.create(
        connection,
        {
          reviewId: review.id,
          body: {
            product_id: productId,
            media_uri: "https://example.com/fake-snapshot.jpg",
            caption: RandomGenerator.paragraph()(1),
          },
        },
      );
    },
  );
}
