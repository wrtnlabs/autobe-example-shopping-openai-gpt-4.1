import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that administrator cannot upload attachments larger than the allowed
 * maximum size to a comment.
 *
 * This test ensures validation of file size limits on comment file attachments
 * by admin role. The workflow is:
 *
 * 1. Create a community post as admin (prerequisite for comment).
 * 2. Add a comment to the created post as admin.
 * 3. Attempt to attach a file to the comment with a file_size that should be
 *    rejected ("too large").
 * 4. Confirm the API responds with a validation error.
 * 5. Confirm an attachment object was not created for the invalid upload.
 *
 * Note: Attachment listing/retrieval for verifying non-creation is not possible
 * as retrieval API is not provided.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_create_attachment_comment_admin_file_size_exceeded(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()()(8),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment on the post as administrator
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.alphabets(20),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Attempt to upload an oversized file (> allowed max) to the comment
  // The actual max limit may not be documented, so we use a very large value for testing (e.g., 1GB)
  const oversizedAttachmentBody: IAimallBackendAttachment.ICreate = {
    comment_id: comment.id,
    file_uri: `s3://bucket/oversized-file-${Date.now()}.dat`,
    file_type: "application/octet-stream",
    file_size: 1073741824,
  };

  // 4. Confirm validation error is returned
  await TestValidator.error("file size exceeded error")(() =>
    api.functional.aimall_backend.administrator.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: oversizedAttachmentBody,
      },
    ),
  );

  // 5. Optionally, if attachment retrieval API were available, verify no attachments created for this comment.
  // However, such an API is not provided in current materials, so this step is omitted.
}
