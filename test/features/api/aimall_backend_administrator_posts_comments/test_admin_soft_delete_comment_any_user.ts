import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that administrators are able to soft-delete (set deleted_at) any
 * post comment regardless of author (moderation power).
 *
 * This test verifies that an admin can moderate (soft-delete) comments authored
 * by regular users, establishing the business power of moderator/admin accounts
 * to manage community content. Ensures business rule compliance for moderation
 * and content audit.
 *
 * Steps:
 *
 * 1. Authenticate as an administrator (using the administrator list endpoint).
 *    (Assumes test connection is pre-authenticated as admin.)
 * 2. As a customer, create a new post (title/body/random content)
 * 3. As the customer, add a comment to the post
 * 4. As admin, permanently soft-delete this comment using the admin comment erase
 *    endpoint
 * 5. (Omitted, not implementable: Check that comment is marked as deleted via
 *    admin get or omitted from normal listing)
 *
 * Only implementable steps are included due to SDK/API constraints.
 */
export async function test_api_aimall_backend_administrator_posts_comments_erase_soft_delete_any_user(
  connection: api.IConnection,
) {
  // 1. Authenticate as an administrator — fetch at least one admin (assume connection is authorized for further action)
  const admin: IAimallBackendAdministrator.ISummary =
    await api.functional.aimall_backend.administrator.administrators.index(
      connection,
    );
  typia.assert(admin);

  // 2. As a customer, create a new community post
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);

  // 3. As the customer, add a comment to the post
  const comment: IAimallBackendComment =
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

  // 4. As admin, soft-delete the user's comment
  await api.functional.aimall_backend.administrator.posts.comments.erase(
    connection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // No further validation possible (no read API for comments via admin or post listing in SDK)
}
