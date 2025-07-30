import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that a customer (post owner) can delete an attachment from their own
 * post.
 *
 * Business context: Posts may have media/file attachments. Only the post owner
 * (customer) should be able to delete attachments from their post. The deletion
 * should be a hard delete (permanently removed — not just soft-deleted).
 *
 * Step-by-step process:
 *
 * 1. Register a new customer (will act as post/attachment owner).
 * 2. Customer creates a new post.
 * 3. Customer uploads an attachment to the post.
 * 4. Owner deletes the attachment.
 * 5. Attempt to delete the same attachment again (should result in error, proving
 *    hard deletion).
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_delete_attachment_on_post_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer (post/attachment owner)
  const email = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(32),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Customer creates a new post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 3. Customer uploads an attachment to the post
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri:
            "s3://bucket/test-" +
            typia.random<string & tags.Format<"uuid">>() +
            ".jpg",
          file_type: "image/jpeg",
          file_size: 1024,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Owner deletes the attachment
  await api.functional.aimall_backend.customer.posts.attachments.erase(
    connection,
    {
      postId: post.id,
      attachmentId: attachment.id,
    },
  );

  // 5. Attempt to delete the same attachment again (should fail as it is already deleted)
  await TestValidator.error("delete again should fail - already hard deleted")(
    () =>
      api.functional.aimall_backend.customer.posts.attachments.erase(
        connection,
        {
          postId: post.id,
          attachmentId: attachment.id,
        },
      ),
  );
}
