import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Verify successful upload of a valid attachment to a customer product review.
 *
 * This test checks the happy path for attaching a file (image/video/document)
 * to a customer's product review.
 *
 * Steps:
 *
 * 1. Create a review with valid input data as a customer.
 * 2. Prepare a valid IAimallBackendAttachment.ICreate referencing the created
 *    reviewId.
 * 3. Upload the attachment using the appropriate endpoint.
 * 4. Confirm the response maps exactly to the input: review_id reference, file
 *    URI, file type, file size, and proper creation metadata.
 * 5. Validate all critical fields using typia.assert and
 *    TestValidator.equals/predicate.
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_create_review_attachment_success(
  connection: api.IConnection,
) {
  // 1. Create a new review with realistic input data
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Amazing build quality!",
    body: "Was pleasantly surprised by the construction and clarity of sound.",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 2. Prepare an attachment input (valid jpeg image, typical file size)
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: null,
    comment_id: null,
    review_id: review.id,
    file_uri: `s3://aimall/reviews/${review.id}/photo.jpg`,
    file_type: "image/jpeg",
    file_size: 102400, // 100 KB typical for an image
  };

  // 3. Use the attachment creation endpoint, referencing the review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Validate returned fields match the sent data and are type-correct
  TestValidator.equals("attachment.review_id matches")(attachment.review_id)(
    review.id,
  );
  TestValidator.equals("attachment.file_uri matches")(attachment.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("attachment.file_type matches")(attachment.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("attachment.file_size matches")(attachment.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.predicate("created_at present and RFC3339")(
    !!attachment.created_at && !isNaN(Date.parse(attachment.created_at)),
  );
}
