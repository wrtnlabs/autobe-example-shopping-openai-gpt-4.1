import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate error handling when retrieving metadata for a non-existent
 * attachment.
 *
 * This test calls the GET
 * /aimall-backend/administrator/attachments/{attachmentId} endpoint using a
 * random UUID that is extremely unlikely to exist in the database. It expects
 * the system to reject this request with an error (typically a 404 not found or
 * similar error response).
 *
 * Business context:
 *
 * - The endpoint is designed to allow privileged operators (administrators) to
 *   view metadata for attachments.
 * - Proper error reporting on invalid or unknown identifiers is a critical part
 *   of robust backend API design.
 *
 * Steps:
 *
 * 1. Generate a random UUID to act as a fake/non-existent attachmentId.
 * 2. Call the attachments.at endpoint with this UUID.
 * 3. Confirm that an error is thrown (e.g., not-found/404/HttpError).
 * 4. (Do not check error message or type, simply assert an error occurs.)
 */
export async function test_api_aimall_backend_administrator_attachments_test_retrieve_attachment_metadata_with_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for attachmentId
  const fakeAttachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2~3. Attempt to retrieve nonexistent attachment metadata and confirm error is thrown
  await TestValidator.error("should throw error for nonexistent attachment")(
    async () => {
      await api.functional.aimall_backend.administrator.attachments.at(
        connection,
        {
          attachmentId: fakeAttachmentId,
        },
      );
    },
  );
}
