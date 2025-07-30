import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate access control enforcement when deleting a post attachment as a
 * non-owner.
 *
 * Verifies that a user who does not own a post cannot delete its attachments.
 * This test covers strict owner-based access control on DELETE
 * /aimall-backend/customer/posts/{postId}/attachments/{attachmentId}.
 *
 * Steps:
 *
 * 1. Register Customer A (resource owner)
 * 2. Register Customer B (external user)
 * 3. Customer A creates a post
 * 4. Customer A uploads one attachment to the post
 * 5. Customer B attempts to delete the attachment (should receive
 *    forbidden/unauthorized error)
 *
 * Notes:
 *
 * - This test simulates authentication context switches. In a real E2E suite,
 *   distinct API connections or mechanisms for user switching should be used to
 *   ensure accurate context for each step.
 * - Uses TestValidator.error to validate access-control enforcement.
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_delete_attachment_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Customer A (resource owner)
  const customerAInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerAInput },
  );
  typia.assert(customerA);

  // 2. Register Customer B (external user)
  const customerBInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  };
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerBInput },
  );
  typia.assert(customerB);

  // 3. Customer A creates a post
  // (assume connection is now authenticated as Customer A)
  const postInput: IAimallBackendPost.ICreate = {
    title: "Test Post by Customer A",
    body: "Content of test post.",
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 4. Customer A uploads an attachment to their post
  const attachmentInput: IAimallBackendAttachment.ICreate = {
    post_id: post.id,
    file_uri: "s3://bucket/path/to/test-file.jpg",
    file_type: "image/jpeg",
    file_size: 123456,
  };
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      { postId: post.id, body: attachmentInput },
    );
  typia.assert(attachment);

  // 5. Simulate Customer B context and attempt to delete the attachment
  // (In a real E2E environment, use Customer B's authenticated connection)
  await TestValidator.error("Non-owner cannot delete post attachment")(
    async () => {
      await api.functional.aimall_backend.customer.posts.attachments.erase(
        connection,
        { postId: post.id, attachmentId: attachment.id },
      );
    },
  );
}
