import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that an administrator can successfully delete any attachment on any
 * review, regardless of customer ownership.
 *
 * Business context: Administrators should have the authority to manage content
 * across the system, including attachments on customer reviews. This ensures
 * inappropriate or unwanted media can be removed regardless of the customer who
 * created it.
 *
 * Step-by-step process:
 *
 * 1. Customer creates a product review (setup prerequisite for attachment).
 * 2. Customer uploads an attachment to the created review.
 * 3. As an administrator, use the admin DELETE endpoint to remove this attachment
 *    (cross-role privilege).
 * 4. Confirm that the attachment is deleted by attempting to delete it again and
 *    expecting an error (i.e., resource is gone).
 */
export async function test_api_aimall_backend_test_delete_review_attachment_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Customer creates a review (must be logged in as customer beforehand)
  const reviewBody: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Great product!",
    body: "Shipping was fast and the quality is top-notch.",
    rating: 5,
  };
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: reviewBody,
    },
  );
  typia.assert(review);

  // 2. Customer uploads an attachment to the review
  const attachmentBody: IAimallBackendAttachment.ICreate = {
    post_id: null,
    comment_id: null,
    review_id: review.id,
    file_uri: `s3://uploads/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 2048,
  };
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 3. As admin, delete the attachment (connection context switches to admin before this call)
  await api.functional.aimall_backend.administrator.reviews.attachments.erase(
    connection,
    {
      reviewId: review.id,
      attachmentId: attachment.id,
    },
  );

  // 4. Confirm the attachment is deleted by attempting another delete (should error)
  await TestValidator.error(
    "Attachment is already deleted; admin delete fails again",
  )(() =>
    api.functional.aimall_backend.administrator.reviews.attachments.erase(
      connection,
      {
        reviewId: review.id,
        attachmentId: attachment.id,
      },
    ),
  );
}
