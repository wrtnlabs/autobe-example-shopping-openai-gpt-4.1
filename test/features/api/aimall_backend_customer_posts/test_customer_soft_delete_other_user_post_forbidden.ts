import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate forbidding a customer from soft-deleting another user's post.
 *
 * Workflow:
 *
 * 1. As customer1, create a post
 * 2. As customer2, attempt to soft-delete that post (should fail)
 *
 * EXPECTED: The DELETE must throw a permission error (forbidden). No SDK exists
 * to fetch post by ID for further validation.
 *
 * Note: This test **assumes** the caller provides two distinct authenticated
 * connections: one for customer1 (the post owner) and one for customer2 (the
 * intruder).
 */
export async function test_api_aimall_backend_customer_posts_test_customer_soft_delete_other_user_post_forbidden(
  customer1: api.IConnection,
  customer2: api.IConnection,
) {
  // 1. Create a post as customer1
  const post = await api.functional.aimall_backend.customer.posts.create(
    customer1,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attempt to soft-delete as intruder customer (should fail)
  await TestValidator.error("forbidden to delete other's post")(async () => {
    await api.functional.aimall_backend.customer.posts.erase(customer2, {
      postId: post.id,
    });
  });
}
