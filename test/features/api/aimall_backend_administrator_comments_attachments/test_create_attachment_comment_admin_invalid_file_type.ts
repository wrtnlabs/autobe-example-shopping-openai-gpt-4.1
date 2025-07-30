import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that the administrator cannot upload an attachment of an unapproved
 * (forbidden) file type to a comment.
 *
 * Business context: The system must reject files that do not meet approved file
 * type constraints when attached to a comment, ensuring malware, unsafe
 * scripts, or unsupported archives cannot be uploaded. This is essential for
 * content moderation and overall platform security.
 *
 * Steps:
 *
 * 1. Create a post as administrator to provide the context for the comment.
 * 2. Create a comment on that post as administrator.
 * 3. Attempt to upload an attachment with an invalid/forbidden file type (e.g.,
 *    'application/x-sh', 'application/x-rar-compressed',
 *    'application/x-msdownload') to the comment as administrator.
 * 4. Confirm that the operation fails and the error is a file type
 *    validation/business logic error (NOT a TypeScript validation error). The
 *    upload should be rejected at the API runtime/business layer, not at
 *    compile time.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_create_attachment_comment_admin_invalid_file_type(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(2),
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
          body: RandomGenerator.paragraph()(1),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Attempt to upload a forbidden file type
  // For this test, use an obviously forbidden type, e.g., a shell script, archive, or binary
  const forbiddenTypes = [
    { type: "application/x-sh", uri: "s3://forbidden/script.sh" },
    { type: "application/x-rar-compressed", uri: "s3://forbidden/archive.rar" },
    { type: "application/x-msdownload", uri: "s3://forbidden/malware.exe" },
  ];

  for (const forbidden of forbiddenTypes) {
    await TestValidator.error(
      `forbidden type (${forbidden.type}) not allowed for comment attachment`,
    )(async () => {
      await api.functional.aimall_backend.administrator.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            file_uri: forbidden.uri,
            file_type: forbidden.type,
            file_size: typia.random<number & tags.Type<"int32">>(),
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    });
  }
}
