import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate API rejection of admin post attachments created with missing
 * required data.
 *
 * This test ensures that when an admin attempts to upload a post attachment
 * through the administrator API, omitting required fields (such as file_uri,
 * file_type, or supplying invalid file_size), the API responds with proper
 * validation errors and does not create the attachment.
 *
 * Business context: Attachments must always specify a file_uri (object storage
 * path or uploaded URI), file_type (MIME type), and file_size in bytes. Admins
 * must not be able to create attachments with these fields missing or empty.
 * This test ensures data integrity and API input validation for administrator
 * upload flows.
 *
 * Steps:
 *
 * 1. Create an admin post to serve as attachment context
 * 2. Attempt to create an attachment with missing/empty file_uri, expect
 *    validation error
 * 3. Attempt to create an attachment with missing/empty file_type, expect
 *    validation error
 * 4. Attempt to create an attachment with invalid file_size (zero or negative),
 *    expect validation error
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_admin_attachment_upload_missing_required_data(
  connection: api.IConnection,
) {
  // 1. Create a post as admin for context
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attempt to create an attachment with file_uri missing (empty)
  await TestValidator.error("attachment: missing file_uri")(() =>
    api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          file_uri: "",
          file_type: "image/jpeg",
          file_size: 1000,
        } as IAimallBackendAttachment.ICreate,
      },
    ),
  );

  // 3. Attempt with file_type missing (empty)
  await TestValidator.error("attachment: missing file_type")(() =>
    api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          file_uri: "s3://test/path.jpg",
          file_type: "",
          file_size: 2000,
        } as IAimallBackendAttachment.ICreate,
      },
    ),
  );

  // 4. Attempt with invalid file_size (zero)
  await TestValidator.error("attachment: invalid file_size")(() =>
    api.functional.aimall_backend.administrator.posts.attachments.create(
      connection,
      {
        postId: post.id,
        body: {
          file_uri: "s3://test/path2.jpg",
          file_type: "image/png",
          file_size: 0,
        } as IAimallBackendAttachment.ICreate,
      },
    ),
  );
}
