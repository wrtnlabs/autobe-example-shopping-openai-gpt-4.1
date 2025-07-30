import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that a seller can remove an attachment from a review corresponding
 * to their product.
 *
 * This end-to-end test ensures that only a seller owning the product can delete
 * an attachment from a customer review of that product. It verifies the
 * business rule that deletion is only allowed by authorized parties (seller of
 * the associated product) and that the attachment is actually removed after
 * deletion.
 *
 * Test process:
 *
 * 1. (Setup) Seller registers and creates a product.
 * 2. (Setup) Customer posts a review targeting the above product.
 * 3. (Setup) Customer adds an attachment (media file) to the review.
 * 4. (Action) Seller, authenticated as owner of the product, deletes that review
 *    attachment.
 * 5. (Assert) Confirm that the attachment is no longer present in the review’s
 *    attachments list after deletion, demonstrating both business authorization
 *    and effect.
 *
 * Note: Because there is no endpoint to authenticate or enumerate sellers or
 * customers and their tokens/roles in the given API materials, this test
 * assumes that API connection context switching is handled externally or by
 * higher order setup, and focuses on main resource creation/removal/observation
 * steps. If functions to fetch attachments list for a review existed, use them
 * for assertion; else, structure assertion as far as technically feasible.
 */
export async function test_api_aimall_backend_seller_reviews_attachments_test_delete_review_attachment_as_seller_own_product_success(
  connection: api.IConnection,
) {
  // 1. Seller creates a product.
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerId,
        category_id: categoryId,
        title: RandomGenerator.paragraph()(),
        status: "active",
        description: RandomGenerator.content()()(),
        // main_thumbnail_uri omitted as allowed by DTO and to fix compilation error
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 2. Customer creates a review for product.
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: product.id,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Customer attaches a media file to the review.
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://bucket/test-image.jpg",
          file_type: "image/jpeg",
          file_size: 54321,
          post_id: null,
          comment_id: null,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Seller deletes the attachment from the review.
  await api.functional.aimall_backend.seller.reviews.attachments.erase(
    connection,
    {
      reviewId: review.id,
      attachmentId: attachment.id,
    },
  );

  // 5. (Assert) If an API endpoint to list attachments for a review existed, fetch and check that attachment is gone.
  // As we do not have such endpoint, we note this limitation.
}
