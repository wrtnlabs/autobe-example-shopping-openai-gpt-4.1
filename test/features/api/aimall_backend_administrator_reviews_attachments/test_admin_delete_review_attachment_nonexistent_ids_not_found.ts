import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate that an administrator attempting to delete a review attachment with
 * nonexistent IDs results in a not-found error.
 *
 * This test verifies that the DELETE endpoint for removing a review attachment
 * properly returns an error when called with random, non-existent UUIDs for
 * both the review and the attachment, as would occur if an admin tries to act
 * on unknown resources.
 *
 * Step-by-step process:
 *
 * 1. Generate two random UUIDs (not linked to any real review/attachment).
 * 2. Attempt to invoke the admin delete attachment API with these UUIDs.
 * 3. Confirm that the operation fails and throws a not-found (HTTP 404) error.
 */
export async function test_api_aimall_backend_administrator_reviews_attachments_test_admin_delete_review_attachment_nonexistent_ids_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs for review and attachment that likely do not exist
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const attachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to erase the attachment; expect NotFound error (404)
  await TestValidator.error(
    "should throw not-found for non-existent review/attachment",
  )(async () => {
    await api.functional.aimall_backend.administrator.reviews.attachments.erase(
      connection,
      {
        reviewId,
        attachmentId,
      },
    );
  });
}
