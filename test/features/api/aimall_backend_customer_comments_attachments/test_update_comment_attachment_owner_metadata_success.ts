import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that a customer can update allowed metadata fields for a file
 * attached to their own comment.
 *
 * This test ensures that a customer who uploads an attachment to their comment
 * can later update mutable fields (such as file_uri, file_type, or file_size)
 * for their own comment attachment using the permitted patch API.
 *
 * This simulates the real-world scenario of a user correcting or adjusting the
 * metadata of an uploaded file, which is an important aspect for file
 * governance, reprocessing, or administrative tasks. Only fields allowed by the
 * DTO's definition should be attempted for update.
 *
 * Steps:
 *
 * 1. Create a post as the customer.
 * 2. Post a comment to that post.
 * 3. Upload a file/attachment to the comment as the customer.
 * 4. Update mutable metadata fields of the uploaded attachment (e.g., change
 *    file_type, file_uri, or file_size).
 * 5. Validate the response reflects the updated metadata and the record's id is
 *    unchanged.
 * 6. Optionally, if there is an audit log or equivalent, check that a change is
 *    registered (skipped here if not implementable).
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_update_comment_attachment_owner_metadata_success(
  connection: api.IConnection,
) {
  // 1. Create a post as the customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()(1)(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment for the post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
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

  // 3. Upload an attachment to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://${RandomGenerator.alphaNumeric(8)}.jpg`,
          file_type: "image/jpeg",
          file_size: 123456,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Update allowed metadata fields of the attachment (e.g., change file_type, file_uri, file_size)
  const newFileType = "image/png";
  const newFileUri = `s3://${RandomGenerator.alphaNumeric(8)}.png`;
  const newFileSize = 654321;
  const updated =
    await api.functional.aimall_backend.customer.comments.attachments.update(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
        body: {
          file_type: newFileType,
          file_uri: newFileUri,
          file_size: newFileSize,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Validate updated metadata and record integrity
  TestValidator.equals("updated id")(updated.id)(attachment.id);
  TestValidator.equals("file_type updated")(updated.file_type)(newFileType);
  TestValidator.equals("file_uri updated")(updated.file_uri)(newFileUri);
  TestValidator.equals("file_size updated")(updated.file_size)(newFileSize);

  // 6. Optionally, check audit log (skipped unless API for this is available)
}
