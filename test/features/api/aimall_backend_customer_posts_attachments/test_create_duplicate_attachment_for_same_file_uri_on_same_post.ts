import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Attempt to create two attachments with the same file URI on the same post.
 *
 * This test creates a new post, then uploads an attachment (with a specific
 * file_uri) to that post. It then attempts to upload a second attachment to the
 * same post using the same file_uri as the first attachment.
 *
 * The test validates whether the system allows duplicate attachments with
 * identical file_uri values for the same post. If a uniqueness constraint is in
 * place, the second attempt should fail (with a conflict or constraint error).
 * If duplication is allowed, the second creation should succeed. The test
 * asserts correctness based on observed outcome.
 *
 * Steps:
 *
 * 1. Create a new customer post (dependencies).
 * 2. Upload a first attachment to that post with a generated file_uri.
 * 3. Attempt to upload a second attachment to the same post, with the same
 *    file_uri.
 * 4. Check if duplicate is allowed (success), or if constraint error/conflict is
 *    thrown (failure expected).
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_create_duplicate_attachment_for_same_file_uri_on_same_post(
  connection: api.IConnection,
) {
  // 1. Create a customer post
  const post = await api.functional.aimall_backend.customer.posts.create(
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

  // 2. Upload the first attachment
  const fileUri = `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const fileType = "image/jpeg";
  const fileSize = 1024;
  const firstAttachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: fileUri,
          file_type: fileType,
          file_size: fileSize,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(firstAttachment);

  // 3. Attempt to upload the second, duplicate attachment
  await TestValidator.error(
    "attachment duplicate file_uri for same post should be constraint error",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: fileUri,
          file_type: fileType,
          file_size: fileSize,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  });
}
