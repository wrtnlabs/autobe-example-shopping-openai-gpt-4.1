import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate successful update of attachment metadata by an administrator.
 *
 * This test ensures an attachment belonging to a post can have its allowed
 * metadata fields (such as file_type, file_uri, or file_size) updated via the
 * administrator-only endpoint. Tests the full chain: creating a post, uploading
 * an attachment, updating attachment metadata, and confirming only permitted
 * fields are modifiable and changes persist.
 *
 * Test Steps:
 *
 * 1. Create a new community post using /administrator/posts.
 * 2. Upload an attachment for the post using
 *    /administrator/posts/{postId}/attachments.
 * 3. Update the attachment's metadata via
 *    /administrator/attachments/{attachmentId}—change file_type, file_uri, or
 *    file_size.
 * 4. Validate the response reflects updated metadata for the fields supplied in
 *    the update request.
 * 5. Validate that unmodified fields remain the same.
 * 6. Ensure schema and update restrictions are enforced (no extra fields, only
 *    allowed fields changed).
 */
export async function test_api_aimall_backend_administrator_attachments_test_update_attachment_metadata_successfully(
  connection: api.IConnection,
) {
  // 1. Create a new post
  const postInput = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.paragraph()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Upload an attachment to the post
  const attachmentInput = {
    post_id: post.id,
    file_uri: `s3://testbucket/${typia.random<string>()}`,
    file_type: "image/jpeg",
    file_size: 256_123,
  } satisfies IAimallBackendAttachment.ICreate;
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Prepare update data (change file_type, file_uri, file_size)
  const updateData = {
    file_type: "image/png",
    file_uri: `s3://testbucket/${typia.random<string>()}`,
    file_size: attachment.file_size + 10_000,
  } satisfies IAimallBackendAttachment.IUpdate;

  // 4. Update the attachment's metadata
  const updated =
    await api.functional.aimall_backend.administrator.attachments.update(
      connection,
      {
        attachmentId: attachment.id,
        body: updateData,
      },
    );
  typia.assert(updated);

  // 5. Check updated fields
  TestValidator.equals("updated file_type")(updated.file_type)(
    updateData.file_type,
  );
  TestValidator.equals("updated file_uri")(updated.file_uri)(
    updateData.file_uri,
  );
  TestValidator.equals("updated file_size")(updated.file_size)(
    updateData.file_size,
  );

  // 6. Check unmodified fields are unchanged
  TestValidator.equals("id unchanged")(updated.id)(attachment.id);
  TestValidator.equals("post_id unchanged")(updated.post_id)(
    attachment.post_id,
  );
  TestValidator.equals("comment_id unchanged")(updated.comment_id)(
    attachment.comment_id,
  );
  TestValidator.equals("review_id unchanged")(updated.review_id)(
    attachment.review_id,
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    attachment.created_at,
  );
}
