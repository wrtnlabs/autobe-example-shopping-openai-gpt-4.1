import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate seller's retrieval of attachment details for their own post.
 *
 * This test simulates the end-to-end workflow for a seller retrieving the
 * detailed metadata of an attachment for a post they created. This ensures
 * correct file-to-post linkage and that only authorized sellers can retrieve
 * attachments belonging to their posts.
 *
 * Test procedure:
 *
 * 1. Create a seller post (obtain postId).
 * 2. Upload an attachment to the post (obtain attachmentId and input metadata).
 * 3. Retrieve the attachment by its ID for this post.
 * 4. Validate that the response data matches the metadata of the created
 *    attachment and that post linkage is correct.
 */
export async function test_api_aimall_backend_test_get_attachment_detail_for_post_by_seller_with_valid_ids(
  connection: api.IConnection,
) {
  // 1. Seller creates a post
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Seller uploads an attachment to the post
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    file_uri: `s3://bucket/fakefile-${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 123456,
  };
  const attachment =
    await api.functional.aimall_backend.seller.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Retrieve the attachment details by postId and attachmentId
  const detail =
    await api.functional.aimall_backend.seller.posts.attachments.at(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(detail);

  // 4. Validate that details match the uploaded attachment metadata and linkage
  TestValidator.equals("attachment id matches")(detail.id)(attachment.id);
  TestValidator.equals("file uri matches")(detail.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("file type matches")(detail.file_type)(
    attachment.file_type,
  );
  TestValidator.equals("file size matches")(detail.file_size)(
    attachment.file_size,
  );
  TestValidator.equals("post linkage matches")(detail.post_id)(post.id);
}
