import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test: Seller cannot update a comment not owned by them (should fail with
 * permission error)
 *
 * Business scenario:
 *
 * - Seller creates a new post.
 * - Administrator (not the seller) leaves a comment on that post, ensuring
 *   comment ownership mismatch for the test.
 * - Seller (authenticated as the same seller) tries to update the admin-created
 *   comment using the seller comment update endpoint.
 * - The update attempt should fail (permission/access error), because the seller
 *   does not own the comment.
 *
 * Test Steps:
 *
 * 1. Seller creates a post to have an owned post context.
 * 2. Administrator creates a comment on that seller's post to ensure ownership
 *    mismatch.
 * 3. Seller attempts to update the administrator's comment—a permission error
 *    should occur (tested with TestValidator.error()).
 */
export async function test_api_aimall_backend_seller_posts_comments_test_seller_update_comment_not_owned_should_fail(
  connection: api.IConnection,
) {
  // 1. Seller creates a post
  const post = await api.functional.aimall_backend.seller.posts.create(
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

  // 2. Administrator creates a comment on the seller's post
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
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

  // 3. Seller tries to update the comment (not their own). Permission error expected.
  await TestValidator.error("seller cannot update admin-owned comment")(() =>
    api.functional.aimall_backend.seller.posts.comments.update(connection, {
      postId: post.id,
      commentId: comment.id,
      body: {
        body: RandomGenerator.paragraph()(),
      } satisfies IAimallBackendComment.IUpdate,
    }),
  );
}
