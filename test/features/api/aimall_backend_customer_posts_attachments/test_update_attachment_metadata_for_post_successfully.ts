import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test successful update of an attachment's metadata linked to a customer's
 * post.
 *
 * This test case simulates the full business workflow:
 *
 * 1. Register a new customer (who will be the post/attachment owner).
 * 2. Create a new post as that customer.
 * 3. Upload an attachment to the created post.
 * 4. Update the metadata of the attachment (file_type and file_size).
 * 5. Validate that the returned updated attachment reflects the intended changes.
 * 6. Assert that preserved fields (e.g., file_uri, post_id) remain correct.
 *
 * Permissions and correct business logic are verified by executing all actions
 * as the resource owner (authentication flows are assumed abstracted by
 * connection context).
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_update_attachment_metadata_for_post_successfully(
  connection: api.IConnection,
) {
  // 1. Register a new customer (who will own the post and attachment)
  const customerInput = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Create a post for this customer
  const postInput = {
    title: typia.random<string>(),
    body: typia.random<string>(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 3. Upload (create) an attachment for the post
  const attachmentInput = {
    post_id: post.id,
    file_uri: typia.random<string>(),
    file_type: "image/png",
    file_size: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAimallBackendAttachment.ICreate;
  const attachment =
    await api.functional.aimall_backend.customer.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: attachmentInput,
      },
    );
  typia.assert(attachment);

  // 4. Update the attachment's file_type and file_size (simulate metadata edit)
  const updateInput = {
    file_type: "image/jpeg",
    file_size: (attachment.file_size ?? 0) + 111,
  } satisfies IAimallBackendAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.aimall_backend.customer.posts.attachments.update(
      connection,
      {
        postId: post.id,
        attachmentId: attachment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedAttachment);

  // 5. Assert that updated metadata fields reflect the changes
  TestValidator.equals("file_type updated")(updatedAttachment.file_type)(
    updateInput.file_type,
  );
  TestValidator.equals("file_size updated")(updatedAttachment.file_size)(
    updateInput.file_size,
  );

  // 6. Assert that other fields remain unchanged
  TestValidator.equals("file_uri unchanged")(updatedAttachment.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("post_id preserved")(updatedAttachment.post_id)(post.id);
}
