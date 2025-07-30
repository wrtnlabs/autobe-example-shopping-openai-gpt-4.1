import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate customer uploading an attachment file to a post.
 *
 * This test ensures that:
 *
 * 1. A customer can upload an attachment to a post using valid fields (file_uri,
 *    file_type, file_size).
 * 2. The attachment is correctly associated with the target post and all persisted
 *    fields are as expected.
 *
 * Steps:
 *
 * 1. Create a customer post (dependency: to obtain a postId).
 * 2. Upload a new attachment (image or file) using all required fields.
 * 3. Assert that the returned attachment entity is correctly linked to the post,
 *    has correct file metadata, and satisfies business logic.
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_create_post_attachment_as_customer_valid_file(
  connection: api.IConnection,
) {
  // 1. Create a customer post to attach to.
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Prepare a valid file attachment.
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 10240,
  };
  // 3. Upload the attachment.
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Validate that returned attachment is correctly linked and fields are present.
  TestValidator.equals("post linkage")(attachment.post_id)(post.id);
  TestValidator.equals("file uri")(attachment.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("file type")(attachment.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file size")(attachment.file_size)(
    attachmentInput.file_size,
  );
}
