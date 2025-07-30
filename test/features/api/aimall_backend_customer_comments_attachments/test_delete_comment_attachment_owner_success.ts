import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that a customer (as the original uploader) can delete their own comment
 * attachment.
 *
 * This test verifies the business flow where a customer creates a post, adds a
 * comment, uploads an attachment to that comment, then deletes the attachment.
 * It ensures that:
 *
 * - The customer can perform each action as the original uploader (author)
 * - The attachment is properly deleted when the owner requests deletion
 * - Only SDK functions and DTOs provided are used (no fictional helpers)
 * - Each returned record is type-asserted for runtime safety
 *
 * Note: As the available SDK does NOT provide APIs to list or fetch details for
 * attachments after deletion, it is not possible to directly confirm absence
 * except by completion of the deletion API call. If list/detail/reload SDKs are
 * later added, further assertions may be included.
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_delete_comment_attachment_owner_success(
  connection: api.IConnection,
) {
  // 1. Create a post as customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Add a comment to the created post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Upload an attachment to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://testbucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Delete the attachment as the comment owner
  await api.functional.aimall_backend.customer.comments.attachments.erase(
    connection,
    {
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );

  // 5. (Verification limit) There are no SDK endpoints to fetch or list attachments post-delete; successful deletion call is considered sufficient.
}
