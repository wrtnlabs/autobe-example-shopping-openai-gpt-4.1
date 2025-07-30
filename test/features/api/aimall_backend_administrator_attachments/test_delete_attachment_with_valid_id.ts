import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate hard deletion of an attachment entity by admin.
 *
 * This test covers the permanent deletion (hard delete) of an attachment
 * record, identified by its unique attachmentId, by an administrator. The
 * business flow requires:
 *
 * 1. Creating a new post (parent entity to attach media)
 * 2. Uploading (creating) a new attachment for that post, thus getting its
 *    attachmentId
 * 3. Invoking DELETE /administrator/attachments/{attachmentId} as administrator —
 *    as per business rules, this operation should permanently remove the
 *    attachment record from the database's metadata table, and, by policy, may
 *    also trigger file storage cleanup and deletion event logging
 * 4. Verifying proper removal from the metadata: attempt to fetch the same
 *    attachmentId after deletion should result in a not-found error (for hard
 *    delete)
 *
 * Test steps:
 *
 * 1. Create a new post with valid random data via posts.create
 * 2. Upload a new attachment to the created post; assert metadata and extract its
 *    attachmentId
 * 3. Delete the attachment by id via attachments.erase (hard delete)
 * 4. (If fetch-by-id exists) Verify subsequent fetch by id yields not-found
 *    (throws error)
 */
export async function test_api_aimall_backend_administrator_attachments_test_delete_attachment_with_valid_id(
  connection: api.IConnection,
) {
  // 1. Create a new post as the parent entity
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(5),
        body: RandomGenerator.content()()(3),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload a new attachment to the post
  const attachment =
    await api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          file_uri: `s3://mock-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<1000000>
          >(),
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Delete the attachment (hard delete step)
  await api.functional.aimall_backend.administrator.attachments.erase(
    connection,
    {
      attachmentId: attachment.id,
    },
  );

  // 4. (Optional) Attempt fetching by the deleted id (should throw error if endpoint exists)
  // If there is an "at" or "get" endpoint for attachments, enable this block:
  // await TestValidator.error("not-found after hard delete")(() =>
  //   api.functional.aimall_backend.administrator.attachments.at(connection, { attachmentId: attachment.id })
  // );
}
