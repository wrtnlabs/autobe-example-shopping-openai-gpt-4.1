import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling when deleting a non-existent comment attachment as an
 * administrator.
 *
 * This test ensures that if an administrator tries to delete an attachment from
 * a comment, and either the comment ID or the attachment ID (or both) do not
 * exist in the system, the API returns a 404 Not Found error.
 *
 * Business Context: Administrators may attempt cleanup or moderation actions
 * for comment attachments. Proper error handling is critical when requested
 * targets don't exist, both for user feedback and backend integrity.
 *
 * Test Steps:
 *
 * 1. Generate random UUIDs for both commentId and attachmentId that are extremely
 *    unlikely to exist in the database.
 * 2. Attempt to delete the attachment using the admin endpoint with those IDs.
 * 3. Confirm the API responds with a 404 error, indicating the resource was not
 *    found.
 *
 * Expected:
 *
 * - The API must return a 404 Not Found error for non-existent commentId or
 *   attachmentId.
 * - No successful deletion operation should be possible for missing records.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_delete_nonexistent_comment_attachment_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs that are very unlikely to exist
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to delete with non-existent commentId and attachmentId
  await TestValidator.error("delete non-existent attachment returns 404")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.attachments.erase(
        connection,
        {
          commentId: nonExistentCommentId,
          attachmentId: nonExistentAttachmentId,
        },
      );
    },
  );
}
