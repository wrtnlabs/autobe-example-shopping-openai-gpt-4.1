import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that an admin can delete any review attachment regardless of ownership
 * or association.
 *
 * Scenario:
 *
 * 1. A customer creates a review for a product.
 * 2. The customer attaches a file to the review.
 * 3. The admin deletes the newly created attachment via the API (hard delete).
 * 4. (Optional) If an API existed to fetch the attachment, we would confirm it
 *    does not exist.
 *
 * This test verifies that admin privilege allows removing any attachment, and
 * the system performs a hard-delete (no record remains).
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_admin_delete_review_attachment_any_case_success(
  connection: api.IConnection,
) {
  // 1. Customer creates a review for a product
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Excellent purchase experience!",
        body: "Arrived promptly and works as described.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2. Customer uploads an attachment associated to the review
  const attachment =
    await api.functional.aimall_backend.customer.reviews.attachments.create(
      connection,
      {
        reviewId: review.id,
        body: {
          post_id: null,
          comment_id: null,
          review_id: review.id,
          file_uri: `s3://bucket/test-file-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 2048,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Admin deletes the attachment by reviewId and attachmentId
  await api.functional.aimall_backend.administrator.reviews.attachments.erase(
    connection,
    {
      reviewId: review.id,
      attachmentId: attachment.id,
    },
  );

  // 4. (Confirmation step): No API exists to query for the deleted attachment, so confirmation is limited
  // to lack of error during deletion and previous existence of the resource. If a query endpoint exists,
  // a check would be made here to assert that attachment retrieval now fails.
}
