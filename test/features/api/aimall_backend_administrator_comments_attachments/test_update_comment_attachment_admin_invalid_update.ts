import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * E2E test of comment attachment update (invalid case, administrator)
 *
 * This test checks that an administrator is prevented from making disallowed
 * changes to a comment attachment—such as referencing a non-existent file URI
 * or setting a negative file size. The system must validate input and return an
 * error without updating the record.
 *
 * Test steps:
 *
 * 1. Create a post as administrator
 * 2. Create a comment under the post
 * 3. Upload a valid attachment to the comment
 * 4. Attempt to update the attachment with a non-existent file_uri
 *
 *    - Should receive an error; record remains unchanged
 * 5. Attempt to update the attachment with a negative file_size
 *
 *    - Should receive an error; record remains unchanged
 * 6. Attempt with both fields invalid
 *
 *    - Should receive an error; record remains unchanged
 * 7. If possible, validate (by re-fetching) that contents are unchanged
 *
 * Expected result: All invalid changes are rejected, and the original record is
 * not updated.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_update_comment_attachment_admin_invalid_update(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()(3)(3),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment under the post
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(4),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Upload a valid attachment to the comment
  const validAttachment =
    await api.functional.aimall_backend.administrator.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://attachments/${typia.random<string & tags.Format<"uuid">>()}.test.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(validAttachment);

  // Save the original attachment data for later unchanged check
  const originalAttachmentState = { ...validAttachment };

  // 4. Attempt to update the attachment with a non-existent file_uri
  await TestValidator.error("update should fail for non-existent file_uri")(
    async () =>
      await api.functional.aimall_backend.administrator.comments.attachments.update(
        connection,
        {
          commentId: comment.id,
          attachmentId: validAttachment.id,
          body: {
            file_uri: `s3://nonexistent/${typia.random<string & tags.Format<"uuid">>()}.doesnotexist`,
          } satisfies IAimallBackendAttachment.IUpdate,
        },
      ),
  );

  // 5. Attempt to update the attachment with a negative file_size
  await TestValidator.error("update should fail for negative file_size")(
    async () =>
      await api.functional.aimall_backend.administrator.comments.attachments.update(
        connection,
        {
          commentId: comment.id,
          attachmentId: validAttachment.id,
          body: { file_size: -100 } satisfies IAimallBackendAttachment.IUpdate,
        },
      ),
  );

  // 6. Attempt with both fields invalid
  await TestValidator.error("update should fail with both invalid fields")(
    async () =>
      await api.functional.aimall_backend.administrator.comments.attachments.update(
        connection,
        {
          commentId: comment.id,
          attachmentId: validAttachment.id,
          body: {
            file_uri: `s3://invalid/${typia.random<string & tags.Format<"uuid">>()}.fail`,
            file_size: -2048,
          } satisfies IAimallBackendAttachment.IUpdate,
        },
      ),
  );

  // 7. Since there is no GET API for single attachment, we infer non-modification by the errors thrown; if, in the future, such an endpoint exists, would fetch and validate equality with originalAttachmentState here.
}
