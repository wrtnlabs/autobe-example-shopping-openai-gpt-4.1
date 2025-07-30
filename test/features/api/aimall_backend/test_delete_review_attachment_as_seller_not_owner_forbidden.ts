import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Verify forbidden deletion of another seller's product review attachment.
 *
 * This test ensures that if a seller tries to delete a review attachment for a
 * product they do not own, the operation is forbidden.
 *
 * 1. Seller A creates a product (Product A).
 * 2. A customer leaves a review for Product A.
 * 3. The customer attaches a file to the review.
 * 4. Seller B (who does not own Product A) tries to delete the review attachment
 *    via the seller endpoint.
 * 5. The API must return a forbidden error.
 *
 * This test protects against privilege escalation and enforces proper
 * authorization boundaries between sellers.
 */
export async function test_api_aimall_backend_test_delete_review_attachment_as_seller_not_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Seller A creates Product A (in auth context of Seller A)
  const sellerAId: string = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: sellerAId,
        title: "SellerA_Prd_" + RandomGenerator.alphaNumeric(8),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Customer makes a review for Product A
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: "Great Product!",
        body: "I am satisfied.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Customer attaches a file to that review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri:
            "s3://fake-bucket/attachment-" +
            RandomGenerator.alphaNumeric(6) +
            ".jpg",
          file_type: "image/jpeg",
          file_size: 10240,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Seller B switches into context and attempts forbidden deletion
  // (Simulate that connection now belongs to Seller B, who does NOT own product)
  await TestValidator.error("seller not owner forbidden")(() =>
    api.functional.aimall_backend.seller.reviews.attachments.erase(connection, {
      reviewId: review.id,
      attachmentId: attachment.id,
    }),
  );
}
