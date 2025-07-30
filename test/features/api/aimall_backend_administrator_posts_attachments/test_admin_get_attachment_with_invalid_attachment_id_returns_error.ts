import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate error handling when fetching a non-existent attachment by
 * attachmentId from a valid postId as administrator.
 *
 * Scenario:
 *
 * 1. Create a new post as administrator to obtain a valid postId (dependency).
 * 2. Attempt to fetch an attachment using this valid postId but with a random
 *    (invalid or non-existent) attachmentId.
 * 3. The API must return a 'not found' error (HTTP 404 or equivalent), confirming
 *    correct error feedback for missing resources.
 *
 * Steps:
 *
 * 1. Create post via administrator endpoint and obtain postId.
 * 2. Generate a random UUID for attachmentId unlikely to exist.
 * 3. Call GET
 *    /aimall-backend/administrator/posts/{postId}/attachments/{attachmentId}
 *    with valid postId and fake/non-existent attachmentId.
 * 4. Assert that an error is thrown and it's handled as 'not found'.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_admin_get_attachment_with_invalid_attachment_id_returns_error(
  connection: api.IConnection,
) {
  // 1. Create a new post as administrator
  const postInput = {
    title: RandomGenerator.paragraph()(5),
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Generate a random UUID for a non-existent attachmentId
  const fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to fetch attachment with invalid ID, expecting a not found error
  await TestValidator.error(
    "should return not found for non-existent attachment",
  )(() =>
    api.functional.aimall_backend.administrator.posts.attachments.at(
      connection,
      {
        postId: post.id,
        attachmentId: fakeAttachmentId,
      },
    ),
  );
}
