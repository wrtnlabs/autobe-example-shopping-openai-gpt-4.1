import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that an administrator can upload an attachment to a post with all
 * valid fields.
 *
 * Business context:
 *
 * - Attachments (such as images or files) are uploaded to existing posts.
 * - Attachments are linked to a single post via post_id, and include file_uri,
 *   file_type, and file_size metadata.
 * - Only an authorized administrator can perform this action.
 *
 * Steps performed:
 *
 * 1. Admin creates a new post (required for having post_id to attach the file).
 * 2. Admin uploads an attachment with fully valid data and links it to the created
 *    post.
 * 3. Validate that the response contains an attachment entity with correct file
 *    metadata and linkage to the post.
 * 4. Ensure all schema constraints are met (correct UUIDs, file type, size, etc.).
 */
export async function test_api_aimall_backend_administrator_posts_attachments_create_with_valid_input(
  connection: api.IConnection,
) {
  // 1. Create a new post as prerequisite
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload an attachment to the created post
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    comment_id: null,
    review_id: null,
    file_uri: `s3://bucket/${post.id}/file_${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  };
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 3. Validate linkage and metadata
  TestValidator.equals("linked post id")(attachment.post_id)(post.id);
  TestValidator.equals("file type")(attachment.file_type)(
    attachmentInput.file_type,
  );
  TestValidator.equals("file size")(attachment.file_size)(
    attachmentInput.file_size,
  );
  TestValidator.equals("file uri")(attachment.file_uri)(
    attachmentInput.file_uri,
  );
  TestValidator.equals("created_at present")(
    typeof attachment.created_at === "string",
  )(true);
}
