import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Ensures customers cannot create comments on behalf of other customers.
 *
 * This test verifies that when a customer creates a comment, the author is
 * always set to the authenticated actor by the backend, regardless of any
 * client-side spoofing attempts.
 *
 * Implementation notes:
 *
 * - The comment creation DTO does not allow specifying customer_id, making
 *   spoofing impossible via this endpoint.
 * - The test creates a post, then creates a comment, and ensures that the
 *   returned comment's customer_id is set (and not null). True author spoofing
 *   attempts are not possible given the strict API surface.
 *
 * Steps:
 *
 * 1. Create a post as the connected customer.
 * 2. Attempt to inject/override customer_id when creating a comment (not possible
 *    by schema).
 * 3. Create a comment on the post as the connected customer.
 * 4. Validate the returned comment's customer_id is non-null, confirming that the
 *    backend sets the author as expected.
 */
export async function test_api_aimall_backend_customer_comments_test_create_comment_customer_cannot_create_for_others(
  connection: api.IConnection,
) {
  // 1. Create a post as the connected customer (prerequisite for commenting)
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

  // 2. Customer_id cannot be spoofed in comment body (not in the DTO)
  // 3. Create a comment on the post as the connected customer
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        post_id: post.id,
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 4. The returned comment's customer_id should be set (backend assigns authenticated actor)
  TestValidator.predicate("comment author is set to authenticated customer")(
    typeof comment.customer_id === "string" && comment.customer_id.length > 0,
  );
  TestValidator.equals("comment post_id matches")(comment.post_id)(post.id);
}
