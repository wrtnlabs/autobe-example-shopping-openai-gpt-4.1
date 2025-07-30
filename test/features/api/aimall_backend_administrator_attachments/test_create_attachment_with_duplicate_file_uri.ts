import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test creating an attachment with a file URI that already exists for the same
 * post.
 *
 * This test ensures the backend enforces uniqueness or properly handles
 * conflicts when attempting to register two attachments with the same file_uri
 * for a single post entity.
 *
 * Workflow:
 *
 * 1. Create a new post for attachment association.
 * 2. Upload/attach a file to that post (record the file_uri used).
 * 3. Attempt to upload/register a second attachment with exactly the same file_uri
 *    for the same post.
 * 4. Observe and assert that the second attempt fails as per business logic
 *    (conflict or validation error).
 *
 * - If no error occurs, that's a defect (system should not permit duplicate
 *   file_uri on a post).
 *
 * Steps:
 *
 * 1. Create a valid post
 * 2. Attach a unique file (using sample file_uri) to the post
 * 3. Attempt duplicate attachment to same post with same file_uri
 * 4. Assert error or conflict response
 */
export async function test_api_aimall_backend_administrator_attachments_test_create_attachment_with_duplicate_file_uri(
  connection: api.IConnection,
) {
  // 1. Create a valid post to serve as the parent entity
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()(2)(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attach a unique file to the post
  const fileUri = `s3://upload-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const fileType = "image/jpeg";
  const fileSize = 1024 * 50; // 50KB

  const firstAttachment =
    await api.functional.aimall_backend.administrator.attachments.create(
      connection,
      {
        body: {
          post_id: post.id,
          file_uri: fileUri,
          file_type: fileType,
          file_size: fileSize,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(firstAttachment);

  // 3. Attempt duplicate attachment with same file_uri to the same post
  await TestValidator.error("should not allow duplicate file_uri on same post")(
    async () => {
      await api.functional.aimall_backend.administrator.attachments.create(
        connection,
        {
          body: {
            post_id: post.id,
            file_uri: fileUri,
            file_type: fileType,
            file_size: fileSize,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    },
  );
}
