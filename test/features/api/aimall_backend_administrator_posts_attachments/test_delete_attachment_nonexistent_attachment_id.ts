import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test error response when deleting a nonexistent attachment from a post, and
 * verify proper error handling (404 or similar).
 *
 * Business scenario:
 *
 * - A valid post is created as the context. (Dependency)
 * - Then, an administrator attempts to DELETE an attachment using a random
 *   (nonexistent) attachmentId under the post.
 * - The system is expected to return a not found (404) or appropriate error.
 *
 * Steps:
 *
 * 1. Create a valid community post (as baseline - no attachments).
 * 2. Call the DELETE attachment endpoint with postId=created post,
 *    attachmentId=random UUID.
 * 3. Ensure an error is thrown (TestValidator.error), indicating proper error (404
 *    or similar, not silent success).
 * 4. (Optional/audit) Such attempts should be recorded in logs by the backend, but
 *    this is not testable by API here.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_delete_attachment_nonexistent_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a community post as the baseline
  const post = await api.functional.aimall_backend.customer.posts.create(
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

  // 2. Attempt to delete with a random, nonexistent attachmentId
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error(
    "Should error (404) when deleting nonexistent attachment",
  )(async () => {
    await api.functional.aimall_backend.administrator.posts.attachments.erase(
      connection,
      {
        postId: post.id,
        attachmentId: invalidAttachmentId,
      },
    );
  });
}
