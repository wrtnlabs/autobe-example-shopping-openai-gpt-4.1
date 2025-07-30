import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that non-administrator users (such as a customer) are forbidden from
 * deleting post attachments via the administrator DELETE endpoint.
 *
 * This test simulates privilege escalation attempts, ensuring that only
 * administrators can perform destructive operations on attachments using the
 * admin API.
 *
 * Step-by-step process:
 *
 * 1. Create a customer post as the non-admin user (using the customer posts
 *    endpoint).
 * 2. Add an attachment to this post using the customer attachment upload endpoint.
 * 3. Attempt to delete the attachment through the admin API as a non-admin,
 *    expecting a forbidden error.
 * 4. Confirm the attachment record is unaffected after the failed delete attempt
 *    (cannot verify directly due to missing GET API, but no exceptions/side
 *    effects should occur).
 */
export async function test_api_aimall_backend_test_delete_attachment_insufficient_permissions(
  connection: api.IConnection,
) {
  // 1. Create a post as a customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Add an attachment to this post
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri:
            "s3://test-bucket/" +
            typia.random<string & tags.Format<"uuid">>() +
            ".jpg",
          file_type: "image/jpeg",
          file_size: 51200,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Attempt to delete the attachment using the admin API (should throw forbidden error)
  await TestValidator.error(
    "non-admin should not be able to erase attachment via admin API",
  )(async () => {
    await api.functional.aimall_backend.administrator.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
      },
    );
  });

  // 4. Since there's no attachment GET or LIST API in the SDK, we cannot directly verify that the attachment remains.
  // Indirectly, assume that no exception or state change indicates the attachment is still present.
}
