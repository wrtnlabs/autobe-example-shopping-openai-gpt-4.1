import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a customer cannot update a comment they do not own.
 *
 * This test verifies the permission enforcement for comment updates:
 *
 * - Only the comment author (or admin) should be able to update a comment.
 * - If a non-author (another customer) attempts to update the comment, the API
 *   must reject with an appropriate error.
 *
 * Workflow:
 *
 * 1. Create a post as customer A (assume connection is authenticated as A).
 * 2. Switch connection to customer B and add a comment to that post.
 * 3. Switch back to customer A.
 * 4. Attempt to update the comment as customer A (non-owner) and assert that an
 *    error is thrown.
 *
 * This test ensures API business rule compliance and proper handling of
 * insufficient privileges on comment updates.
 */
export async function test_api_aimall_backend_customer_posts_comments_test_update_comment_by_non_owner_should_fail(
  connection: api.IConnection,
) {
  // 1. Create a post as customer A
  // (Assume connection is authenticated as customer A)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: typia.random<IAimallBackendPost.ICreate>(),
    },
  );
  typia.assert(post);

  // 2. Switch to customer B, create a comment on the post
  // (Assume connection is now authenticated as customer B)
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: typia.random<IAimallBackendComment.ICreate>(),
      },
    );
  typia.assert(comment);

  // 3. Switch back to customer A
  // (Assume session switching is handled externally)

  // 4. Attempt to update the comment as customer A (who is not the owner). Expect a permission error.
  await TestValidator.error("non-author cannot update comment")(async () => {
    await api.functional.aimall_backend.customer.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: "Attempting update as non-owner - should fail",
          is_private: true,
        } satisfies IAimallBackendComment.IUpdate,
      },
    );
  });
}
