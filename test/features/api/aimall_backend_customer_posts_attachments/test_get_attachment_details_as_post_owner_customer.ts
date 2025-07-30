import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate retrieval of detailed attachment information for a post as the
 * post's owner (customer).
 *
 * This test verifies that a customer who owns a post can retrieve detailed
 * metadata for an attachment by attachmentId. It ensures that the returned
 * fields match what was uploaded and that the attachment belongs to the correct
 * post.
 *
 * Step-by-step process:
 *
 * 1. Create a new post as the customer
 * 2. Upload an attachment with specific metadata to the post
 * 3. Retrieve the attachment details using GET
 * 4. Validate all the metadata matches the upload (file_uri, file_type, file_size,
 *    post_id, etc.)
 * 5. Confirm ID and post linkage integrity
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_get_attachment_details_as_post_owner_customer(
  connection: api.IConnection,
) {
  // 1. Create a new post as the customer
  const postInput = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Upload a specific attachment to the post
  const attachmentInput = {
    post_id: post.id,
    file_uri: `s3://bucket/fake-file-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  } satisfies IAimallBackendAttachment.ICreate;
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Retrieve the attachment details
  const fetched =
    await api.functional.aimall_backend.customer.posts.attachments.at(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetched);

  // 4. Validate all metadata
  TestValidator.equals("file_uri")(fetched.file_uri)(attachmentInput.file_uri);
  TestValidator.equals("file_type")(fetched.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file_size")(fetched.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.equals("post_id")(fetched.post_id)(post.id);
  // 5. Confirm attachment id matches
  TestValidator.equals("attachment id")(fetched.id)(attachment.id);
}
