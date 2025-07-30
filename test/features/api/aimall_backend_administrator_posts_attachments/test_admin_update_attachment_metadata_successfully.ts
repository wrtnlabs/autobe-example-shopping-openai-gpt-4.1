import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that an administrator can update any post's attachment metadata
 * regardless of ownership
 *
 * This test ensures that the administrator role has privilege to update
 * attachments for any post. It goes through the following steps:
 *
 * 1. Register a new customer
 * 2. As this customer, create a post
 * 3. As this customer, add an attachment to the post
 * 4. As an admin, call the admin update endpoint to modify the attachment's
 *    file_type and file_uri
 * 5. Confirm the update by examining the returned attachment fields
 *
 * (Note: If a direct fetch-by-id for attachment as admin is unavailable, only
 * returned value from update is checked)
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_admin_update_attachment_metadata_successfully(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. As this customer, create a post
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        customer_id: customer.id,
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);

  // 3. As this customer, add an attachment to the post
  const attachment: IAimallBackendAttachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: "s3://test-bucket/test-file.jpg",
          file_type: "image/jpeg",
          file_size: 12345,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. As admin, update the attachment metadata
  const newFileUri = "s3://test-bucket/new-file.png";
  const newFileType = "image/png";
  const newFileSize = 23456;
  const updated: IAimallBackendAttachment =
    await api.functional.aimall_backend.administrator.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: {
          file_uri: newFileUri,
          file_type: newFileType,
          file_size: newFileSize,
        } satisfies IAimallBackendAttachment.IUpdate,
      },
    );
  typia.assert(updated);

  // 5. Validate the updated fields
  TestValidator.equals("update file_uri")(updated.file_uri)(newFileUri);
  TestValidator.equals("update file_type")(updated.file_type)(newFileType);
  TestValidator.equals("update file_size")(updated.file_size)(newFileSize);
}
