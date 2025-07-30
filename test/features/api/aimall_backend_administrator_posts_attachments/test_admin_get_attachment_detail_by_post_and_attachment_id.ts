import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate administrator can retrieve attachment details for a specific post.
 *
 * This test covers the full workflow:
 *
 * 1. Admin creates a post (using /aimall-backend/administrator/posts)
 * 2. Admin attaches a file to the post (using
 *    /aimall-backend/administrator/posts/{postId}/attachments)
 * 3. Admin retrieves the attachment details with
 *    /aimall-backend/administrator/posts/{postId}/attachments/{attachmentId}
 *
 * The test asserts that the returned attachment record includes the correct
 * file_uri, file_type, file_size, association with the correct post_id, and
 * other metadata. The expected behavior is that the attachment details match
 * what was provided at creation, and are correctly linked to the created post.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_get_attachment_detail_by_post_and_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a post as admin
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attach a file to the post
  const attachmentReq: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    file_uri:
      "s3://e2e-test-bucket/" +
      typia.random<string & tags.Format<"uuid">>() +
      ".jpg",
    file_type: "image/jpeg",
    file_size: 102400,
  };
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentReq,
      },
    );
  typia.assert(attachment);

  // 3. Retrieve the attachment by postId and attachmentId
  const detail =
    await api.functional.aimall_backend.administrator.posts.attachments.at(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(detail);

  // 4. Assert retrieved details match creation
  TestValidator.equals("attachment id")(detail.id)(attachment.id);
  TestValidator.equals("post id")(detail.post_id)(post.id);
  TestValidator.equals("file uri")(detail.file_uri)(attachmentReq.file_uri);
  TestValidator.equals("file type")(detail.file_type)(attachmentReq.file_type);
  TestValidator.equals("file size")(detail.file_size)(attachmentReq.file_size);
}
