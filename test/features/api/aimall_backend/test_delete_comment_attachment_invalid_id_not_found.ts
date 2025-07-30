import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that attempting to delete a comment attachment with an invalid or
 * non-existent attachmentId returns 404 Not Found.
 *
 * This test ensures the API robustly rejects invalid deletion requests
 * targeting attachments that do not exist under a given comment. It upholds the
 * correctness of resource identifier handling and prevents accidental data loss
 * from malformed or malicious requests.
 *
 * Steps:
 *
 * 1. Create a new post (using /aimall-backend/customer/posts, dependency).
 * 2. Create a comment on that post (using
 *    /aimall-backend/customer/posts/{postId}/comments, dependency) to get a
 *    valid commentId.
 * 3. Generate a random UUID for attachmentId that is guaranteed NOT to exist.
 * 4. Attempt to delete the non-existent attachment with the valid commentId but
 *    random attachmentId.
 * 5. Assert that the operation fails with a 404 Not Found error (do not validate
 *    error message text).
 */
export async function test_api_aimall_backend_test_delete_comment_attachment_invalid_id_not_found(
  connection: api.IConnection,
) {
  // 1. Create a new post.
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

  // 2. Create a comment for the post.
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Generate a random attachmentId that is not associated with the comment.
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt to delete the invalid attachment and expect a 404 error.
  await TestValidator.error(
    "deleting non-existent attachment should fail with 404",
  )(() =>
    api.functional.aimall_backend.customer.comments.attachments.erase(
      connection,
      {
        commentId: comment.id,
        attachmentId: invalidAttachmentId,
      },
    ),
  );
}
