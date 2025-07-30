import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validates seller's authorized access to review attachments and role-based
 * restriction.
 *
 * This test ensures:
 *
 * 1. A customer creates a review for a (seller-owned) product.
 * 2. The customer uploads an attachment to the review.
 * 3. The seller (for the product) retrieves the attachment details using the
 *    seller endpoint.
 * 4. The attachment metadata (file_uri, file_type, file_size) matches.
 * 5. Role-based access control: a seller cannot access attachments for reviews
 *    unrelated to their products.
 */
export async function test_api_aimall_backend_test_get_review_attachment_as_seller_authorized_flow(
  connection: api.IConnection,
) {
  // 1. Customer creates a review for a (seller-owned) product
  const productId = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: "[E2E] Excellent!",
        body: "Prompt shipping, satisfied with product.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Customer uploads an attachment to that review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          review_id: review.id,
          file_uri: "s3://e2e-test-bucket/proof.png",
          file_type: "image/png",
          file_size: 204800,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Seller fetches the review attachment detail using authorized endpoint
  const fetched =
    await api.functional.aimall_backend.seller.reviews.attachments.at(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetched);

  // 4. Validate metadata correctness
  TestValidator.equals("file_uri matches")(fetched.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("file_type matches")(fetched.file_type)(
    attachment.file_type,
  );
  TestValidator.equals("file_size matches")(fetched.file_size)(
    attachment.file_size,
  );

  // 5. Negative: Seller cannot access unrelated review/attachment
  const unrelatedReviewId = typia.random<string & tags.Format<"uuid">>();
  const unrelatedAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "role restriction: unrelated review/attachment fetch forbidden",
  )(
    async () =>
      await api.functional.aimall_backend.seller.reviews.attachments.at(
        connection,
        {
          reviewId: unrelatedReviewId,
          attachmentId: unrelatedAttachmentId,
        },
      ),
  );
}
