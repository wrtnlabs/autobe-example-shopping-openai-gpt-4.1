import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * E2E test for invalid attachment update validation errors.
 *
 * This test verifies that attempting to update an attachment's metadata on a
 * comment fails with expected validation errors when passing invalid values.
 * The core business rule is that only allowed file types and positive file_size
 * are accepted when performing an update.
 *
 * Workflow:
 *
 * 1. Create a valid post.
 * 2. Create a comment on the post.
 * 3. Add a valid attachment to the comment.
 * 4. Attempt to update the attachment with invalid values (e.g. file_type not
 *    allowed, file_size negative).
 * 5. Confirm that the system throws validation errors and does not update the
 *    record.
 *
 * Validation scenarios covered:
 *
 * - File_type: unsupported MIME type (e.g. 'application/x-sh' if only images/docs
 *   allowed)
 * - File_size: negative value
 * - (If label was an updatable mandatory field, attempt with empty label — but
 *   label is not in schema, so skip) Only implement scenarios possible
 *   according to DTOs and API contract provided.
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_update_comment_attachment_invalid_metadata_validation_error(
  connection: api.IConnection,
) {
  // 1. Create a valid post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "Test post for attachment validation",
        body: "A post body.",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment on the post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "My comment.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Add a valid attachment to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: "s3://bucket/validfile.jpg",
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4a. Attempt to update attachment with a non-allowed file type
  await TestValidator.error(
    "Non-allowed file type should trigger validation error",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_type: "application/x-sh",
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });

  // 4b. Attempt to update attachment with a negative file_size
  await TestValidator.error(
    "Negative file_size should trigger validation error",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_size: -5678,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  });
}
