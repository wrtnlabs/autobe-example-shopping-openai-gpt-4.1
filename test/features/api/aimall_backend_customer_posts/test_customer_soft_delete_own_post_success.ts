import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Simulate a customer soft deleting their own post (by setting the deleted_at
 * field).
 *
 * This test ensures that when a customer deletes their own community post via
 * the provided API, a soft deletion is performed (the record remains for audit
 * purposes, but is typically hidden from regular post queries). While the
 * system’s API currently does not expose a direct way to fetch or list posts
 * after deletion, this test ensures that the API call succeeds and the post is
 * logically removed (soft deleted) as per business rules.
 *
 * Step-by-step process:
 *
 * 1. Create a new post as a customer using the appropriate API endpoint.
 * 2. Soft delete that post by calling the delete endpoint.
 * 3. (Optionally) If a post retrieval endpoint existed, confirm deleted_at is set
 *    and post is unlisted, but absence of such endpoint means the test is
 *    limited to confirmation of successful flow and types.
 */
export async function test_api_aimall_backend_customer_posts_test_customer_soft_delete_own_post_success(
  connection: api.IConnection,
) {
  // 1. Create a new post as an authenticated customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(10),
        body: RandomGenerator.content()(1)(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Soft delete the created post (sets deleted_at, preserves record)
  await api.functional.aimall_backend.customer.posts.erase(connection, {
    postId: post.id,
  });

  // 3. Further validation (e.g., checking deleted_at or audit logs) not possible due to limited API surface.
  // This test confirms that a valid deletion flow is performed without error.
}
