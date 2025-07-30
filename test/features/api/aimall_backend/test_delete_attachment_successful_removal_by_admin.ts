import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test administrator successfully removing an attachment from a post.
 *
 * This test validates that when an admin deletes an attachment from a post, the
 * attachment is permanently removed as per business rules:
 *
 * 1. Create a post as a customer (user)
 * 2. Attach a file to the post as that user
 * 3. As administrator, call the attachment delete endpoint
 *
 * Note: No list/read API exists for attachments, nor audit log access via SDK,
 * so post-removal absence can't be directly verified here. This test focuses on
 * successful delete operation and type safety for the implemented endpoints.
 */
export async function test_api_aimall_backend_test_delete_attachment_successful_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Create a post as a customer (user)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attach a file to the post as user
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. As administrator, delete the attachment
  await api.functional.aimall_backend.administrator.posts.attachments.erase(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );
  // No way to verify removal further since list/read endpoints are absent
}
