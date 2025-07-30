import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate not-found error when admin tries to create a comment on non-existent
 * post.
 *
 * This test ensures that the administrator comment-creation endpoint rejects
 * attempts to create a comment on a postId that does not exist or has been
 * deleted. The response should be a not-found error, properly handled by the
 * API.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as a non-existent postId (to minimize collision
 *    with any actual post records).
 * 2. Attempt to call the admin-post comment creation API with this nonexistent
 *    postId, supplying required comment body data.
 * 3. Expect the operation to fail (throw HttpError), indicating not-found
 *    behavior.
 * 4. (Optional) Validate that the error is indeed a not-found type.
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_create_comment_on_nonexistent_post(
  connection: api.IConnection,
) {
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();
  const body: IAimallBackendComment.ICreate = {
    post_id: nonExistentPostId,
    review_id: null,
    parent_id: null,
    body: "This is a comment attempt for a non-existent post.",
    is_private: false,
  };
  await TestValidator.error(
    "creating comment on non-existent post should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: nonExistentPostId,
        body,
      },
    );
  });
}
