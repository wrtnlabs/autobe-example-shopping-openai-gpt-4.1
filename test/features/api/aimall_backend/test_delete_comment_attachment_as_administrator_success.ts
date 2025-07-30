import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Permanently delete a file/media attachment from a comment as administrator.
 *
 * This test ensures that administrators can fully remove an attachment from a
 * user comment. Once removed, the attachment should not be retrievable and any
 * further deletion attempts should fail. This verifies both correct permission
 * enforcement and true, permanent removal.
 *
 * Test Workflow:
 *
 * 1. Create a comment as a customer
 * 2. Attach a file to that comment as the customer
 * 3. Issue a permanent deletion of the attachment as an administrator
 * 4. Confirm deletion was successful and that further delete attempts yield an
 *    error
 */
export async function test_api_aimall_backend_test_delete_comment_attachment_as_administrator_success(
  connection: api.IConnection,
) {
  // 1. Create a new comment as a customer
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Attach a file to the created comment as the customer
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Permanently delete the attachment as an administrator
  await api.functional.aimall_backend.administrator.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 4. Attempt to delete the now-nonexistent attachment again and expect an error (not-found)
  await TestValidator.error("attachment should already be deleted")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.attachments.erase(
        connection,
        {
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
