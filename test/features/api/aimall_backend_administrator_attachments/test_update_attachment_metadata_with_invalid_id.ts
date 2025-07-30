import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test updating metadata for a non-existent attachment record.
 *
 * Validates that attempting to update an attachment (via PUT to
 * /aimall-backend/administrator/attachments/{attachmentId}) with a random or
 * invalid UUID as attachmentId correctly results in an error (typically
 * not-found/404), with no data modified.
 *
 * 1. Generate a random, presumed-nonexistent attachmentId (UUID)
 * 2. Build a valid update payload with dummy data
 * 3. Attempt the update via API with the invalid attachmentId
 * 4. Assert that an error is thrown by the API and no attachment is returned
 */
export async function test_api_aimall_backend_administrator_attachments_test_update_attachment_metadata_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent attachment UUID
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Build a realistic update payload
  const updatePayload: IAimallBackendAttachment.IUpdate = {
    file_uri: `s3://dummy-bucket/${fakeAttachmentId}.jpg`,
    file_type: "image/jpeg",
    file_size: 123456,
  };

  // 3. Attempt update and expect an error
  await TestValidator.error(
    "Should throw not-found error for non-existent attachmentId",
  )(async () => {
    await api.functional.aimall_backend.administrator.attachments.update(
      connection,
      {
        attachmentId: fakeAttachmentId,
        body: updatePayload,
      },
    );
  });
}
