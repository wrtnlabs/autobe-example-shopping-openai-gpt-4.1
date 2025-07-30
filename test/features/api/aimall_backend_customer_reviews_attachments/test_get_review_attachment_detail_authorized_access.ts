import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate retrieval of review attachment details by authorized roles
 * (customer/uploader, seller, admin).
 *
 * This test validates that a customer (i.e., owner of the review and
 * attachment) can retrieve detailed metadata for their own review attachment by
 * its ID. It ensures all returned metadata fields match the original upload
 * (file_uri, file_type, file_size, created_at, IDs, etc.).
 *
 * Due to the lack of seller/admin authentication APIs in the provided
 * materials, only the customer/owner access is tested for authorized retrieval.
 * Edge/negative cases are included: fetching with non-existent IDs returns an
 * error.
 *
 * **Test Steps:**
 *
 * 1. Create a review as a customer.
 * 2. Upload an attachment to the created review and capture returned metadata/IDs.
 * 3. Fetch the attachment detail using the correct IDs and verify the returned
 *    metadata matches the upload.
 * 4. Optionally, attempt to retrieve an attachment using random, invalid IDs and
 *    confirm access is denied (error is thrown).
 */
export async function test_api_aimall_backend_customer_reviews_attachments_get_review_attachment_detail_authorized_access(
  connection: api.IConnection,
) {
  // 1. Create a new product review as customer
  const reviewInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    { body: reviewInput },
  );
  typia.assert(review);

  // 2. Upload an attachment to the created review
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: null,
    comment_id: null,
    review_id: review.id,
    file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  };
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Fetch the attachment details as the uploading customer
  const output =
    await api.functional.aimall_backend.customer.reviews.attachments.at(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(output);

  // 4. Validate metadata fields match (id, file_uri, file_type, file_size, review_id)
  TestValidator.equals("attachment.id matches")(output.id)(attachment.id);
  TestValidator.equals("attachment.review_id matches")(output.review_id)(
    review.id,
  );
  TestValidator.equals("file_uri matches")(output.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("file_type matches")(output.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file_size matches")(output.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.predicate("created_at is populated as ISO8601 string")(
    typeof output.created_at === "string" && output.created_at.length > 0,
  );

  // 5. (Optional negative): Attempt with random IDs, should fail
  await TestValidator.error("fetching non-existent attachment fails")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.attachments.at(
        connection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
          attachmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
