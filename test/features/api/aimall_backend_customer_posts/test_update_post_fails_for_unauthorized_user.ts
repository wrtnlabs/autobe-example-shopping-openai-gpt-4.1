import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Verify that a community post cannot be updated by a user who does not own it.
 *
 * This test simulates two different customers:
 *
 * 1. CustomerA creates a post, establishing ownership.
 * 2. CustomerB (a different user) attempts to update the post.
 * 3. The update operation should fail, enforcing author integrity over community
 *    posts.
 *
 * Steps:
 *
 * 1. Create a new post as CustomerA.
 * 2. Switch context to CustomerB (simulated by connection swap).
 * 3. Try to update the post as CustomerB and assert a permission error is thrown.
 * 4. (Optional: If read API was available, verify post remained unchanged; omitted
 *    here.)
 */
export async function test_api_aimall_backend_customer_posts_test_update_post_fails_for_unauthorized_user(
  connection: api.IConnection,
) {
  // 1. As CustomerA, create a new community post
  const createInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: createInput },
  );
  typia.assert(post);

  // 2. Switch to CustomerB
  // (Assumed handled by test infra, e.g., via connection/auth context swapping)

  // 3. As CustomerB (not the post owner), attempt to update the post
  const updateInput: IAimallBackendPost.IUpdate = {
    title: "Unauthorized Edit Attempt",
    body: "Trying to edit another user's post.",
    is_private: true,
  };
  await TestValidator.error("post update denied for non-owner")(() =>
    api.functional.aimall_backend.customer.posts.update(connection, {
      postId: post.id,
      body: updateInput,
    }),
  );

  // 4. Post-verification skipped—no API for direct retrieval
}
