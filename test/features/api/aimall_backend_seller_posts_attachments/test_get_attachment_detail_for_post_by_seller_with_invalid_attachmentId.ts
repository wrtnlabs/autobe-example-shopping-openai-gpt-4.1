import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate error handling when fetching an attachment detail by invalid
 * attachmentId under a valid seller post.
 *
 * This test ensures that the API does not leak information or succeed when a
 * seller attempts to fetch an attachment that does not exist under a valid
 * post. It should return an error (e.g., not found or validation error) when
 * the attachmentId is invalid—even though the postId is real—thus enforcing
 * attachment scoping and proper access control.
 *
 * Test Steps:
 *
 * 1. Create a valid seller post to generate a real postId.
 * 2. Attempt to fetch the attachment detail with this postId and a random
 *    (non-existent) attachmentId.
 * 3. Assert that an error is thrown, confirming the attachment resource is not
 *    accessible when the id is invalid or non-existent.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_get_attachment_detail_for_post_by_seller_with_invalid_attachmentId(
  connection: api.IConnection,
) {
  // 1. Create a valid seller post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.paragraph()(16),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Attempt to fetch detail for a non-existent attachmentId
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "attachment detail fetch for invalid ID should throw",
  )(() =>
    api.functional.aimall_backend.seller.posts.attachments.at(connection, {
      postId: post.id,
      attachmentId: invalidAttachmentId,
    }),
  );
}
