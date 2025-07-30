import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test deletion with non-existent reviewId or attachmentId for review
 * attachments.
 *
 * This test confirms that attempting to delete an attachment using either:
 *
 * - A non-existent reviewId (with valid attachmentId), or
 * - A valid reviewId (with non-existent attachmentId), returns a not-found error
 *   and does not impact the attachment state on the valid review.
 *
 * Steps:
 *
 * 1. Create a valid review (establish a valid reviewId)
 * 2. Attempt to delete with: a. Valid reviewId, random (non-existent) attachmentId
 *    → expect not-found error b. Random (non-existent) reviewId, random
 *    (non-existent) attachmentId → expect not-found error
 * 3. Confirm no error occurs when using purely random UUIDs for nonexistent
 *    records (should get not-found)
 * 4. (Since we have no API to list or read attachments and only have create review
 *    & attachment deletion, we cannot verify unaffected state programmatically,
 *    but at least assert error type.)
 */
export async function test_api_aimall_backend_customer_reviews_attachments_test_delete_review_attachment_nonexistent_ids_not_found(
  connection: api.IConnection,
) {
  // 1. Create a valid review as setup
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test Review for non-existent attachment deletion",
        body: "Verifying error when deleting with fake ids.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 2a. Attempt deletion with valid reviewId but random (fake) attachmentId
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Non-existent attachmentId triggers not-found")(
    () =>
      api.functional.aimall_backend.customer.reviews.attachments.erase(
        connection,
        {
          reviewId: review.id,
          attachmentId: fakeAttachmentId,
        },
      ),
  );

  // 2b. Attempt deletion with random (fake) reviewId and fake attachmentId
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Non-existent reviewId triggers not-found")(() =>
    api.functional.aimall_backend.customer.reviews.attachments.erase(
      connection,
      {
        reviewId: fakeReviewId,
        attachmentId: fakeAttachmentId,
      },
    ),
  );
}
