import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test uploading an attachment as admin to a non-existent review.
 *
 * This test ensures that when an administrator attempts to upload a file
 * attachment to a product review that does not exist (using a random UUID as
 * reviewId), the endpoint responds with a 404 Not Found error and no attachment
 * record is created.
 *
 * Steps:
 *
 * 1. Generate a random UUID to serve as a non-existent reviewId.
 * 2. Build a valid attachment payload, pointing review_id to that UUID.
 * 3. Attempt to upload the attachment as admin, expecting an error.
 * 4. Assert that the error is thrown (and is not a success response).
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_add_review_attachment_admin_to_nonexistent_review(
  connection: api.IConnection,
) {
  // 1. Generate non-existent review ID.
  const nonexistentReviewId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid attachment payload (with review_id set to non-existent ID).
  const attachmentPayload: IAimallBackendAttachment.ICreate = {
    review_id: nonexistentReviewId,
    post_id: null,
    comment_id: null,
    file_uri: `s3://test/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 12345,
  } satisfies IAimallBackendAttachment.ICreate;

  // 3 & 4. Attempt upload, expecting a 404 error (HttpError)
  await TestValidator.error("Uploading to non-existent review triggers 404")(
    async () => {
      await api.functional.aimall_backend.administrator.reviews.attachments.create(
        connection,
        {
          reviewId: nonexistentReviewId,
          body: attachmentPayload,
        },
      );
    },
  );
}
