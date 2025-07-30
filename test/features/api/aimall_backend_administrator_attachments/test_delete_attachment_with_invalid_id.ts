import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate DELETE /aimall-backend/administrator/attachments/{attachmentId} with
 * an invalid (non-existent) attachmentId.
 *
 * This test ensures that attempting to delete an attachment record that does
 * not exist returns an error or not-found response, and does not alter any
 * records. It's important for preventing unauthorized or accidental data loss.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any existing attachment.
 * 2. Attempt to call the delete API with this attachmentId.
 * 3. Verify that an error (not found or similar) is returned.
 *
 * Note: As no data query/read function for attachments is available in the SDK,
 * direct DB integrity checks are not implemented.
 */
export async function test_api_aimall_backend_administrator_attachments_test_delete_attachment_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random (non-existent) attachmentId (as UUID)
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to DELETE the attachment and expect an error
  await TestValidator.error(
    "Should return an error for invalid/non-existent attachmentId",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.erase(
      connection,
      {
        attachmentId: invalidAttachmentId,
      },
    );
  });
}
