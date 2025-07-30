import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test successful deletion of a review attachment by the customer who owns both
 * the review and the attachment.
 *
 * This test verifies that when a customer deletes an attachment they uploaded
 * to their own product review, the deletion succeeds and the attachment is no
 * longer present for the review. The flow covers creation of review and
 * attachment as setup. Order or authentication flows are omitted as no such API
 * endpoints exist in the provided schema.
 *
 * Step-by-step process:
 *
 * 1. Generate a mock `product_id` (since no product creation API is provided).
 * 2. Create a review for the product as the customer (assume customer is
 *    authenticated via connection context).
 * 3. Upload an attachment to the newly created review.
 * 4. Delete the attachment using the proper `reviewId` and `attachmentId`
 *    parameters.
 * 5. (Cannot verify deletion by re-fetching or listing attachments, as no such
 *    endpoint exists. Considered passed if API call does not throw.)
 */
export async function test_api_aimall_backend_test_delete_review_attachment_by_owner_success(
  connection: api.IConnection,
) {
  // 1. Generate a mock product_id
  const product_id: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Create a new review for the product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id,
        title: "Great product!",
        body: "This is an amazing item.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Add an attachment to the review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          post_id: null,
          comment_id: null,
          review_id: review.id,
          file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Delete the review attachment
  await api.functional.aimall_backend.customer.reviews.attachments.erase(
    connection,
    {
      reviewId: review.id,
      attachmentId: attachment.id,
    },
  );
  // 5. Cannot verify by fetching/listing (no such API). If no error thrown, test passes.
}
