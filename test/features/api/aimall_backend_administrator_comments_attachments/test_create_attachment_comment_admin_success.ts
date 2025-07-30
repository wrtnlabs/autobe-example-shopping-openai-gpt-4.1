import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that an administrator can upload an attachment to a comment (admin can
 * attach to any comment regardless of ownership).
 *
 * This test does the following:
 *
 * 1. Creates a new post as administrator (required for a comment target)
 * 2. Creates a comment on the post as administrator (target for the attachment)
 * 3. Uploads a valid image attachment to the comment via admin API
 * 4. Confirms the attachment record exists, is linked via comment_id, and its
 *    metadata (file_type, file_uri, file_size) are correct and accessible
 * 5. Uses typia.assert to validate all API responses and TestValidator to check
 *    linkage and metadata
 * 6. Assumes audit logging was triggered on admin operation if API call succeeds
 *    per design (cannot check audit logs directly from E2E)
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_create_attachment_comment_admin_success(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(10),
        body: RandomGenerator.content()()(40),
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
          body: RandomGenerator.paragraph()(5),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Upload a valid image attachment to the comment via admin API
  const file_uri = `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const file_type = "image/jpeg";
  const file_size = 409600; // 400KB
  const attachment =
    await api.functional.aimall_backend.administrator.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri,
          file_type,
          file_size,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Confirm metadata and linkage
  TestValidator.equals("attachment.comment_id matches")(attachment.comment_id)(
    comment.id,
  );
  TestValidator.equals("file_type")(attachment.file_type)(file_type);
  TestValidator.equals("file_uri")(attachment.file_uri)(file_uri);
  TestValidator.equals("file_size")(attachment.file_size)(file_size);

  // 5. (Cannot check audit logs directly, but per successful API completion, audit logging is assumed triggered by design)
}
