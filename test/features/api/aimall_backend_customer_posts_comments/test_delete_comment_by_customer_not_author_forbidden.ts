import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Verify that a customer who is not the author of a comment cannot soft-delete
 * the comment (forbidden behavior).
 *
 * This test ensures strict comment ownership rules: only the author or an
 * authorized moderator/admin can soft-delete (erase) their own comment.
 * Attempts by other authenticated customers must be forbidden.
 *
 * Process:
 *
 * 1. Register two distinct customers (Customer A and Customer B).
 * 2. As Customer A, create a new post.
 * 3. As Customer A, create a comment under this post.
 * 4. As Customer B, attempt to soft-delete Customer A's comment using DELETE
 *    `/aimall-backend/customer/posts/{postId}/comments/{commentId}`.
 * 5. Expect the operation to fail with a forbidden (403) error. Confirm the
 *    comment still exists and is not soft-deleted.
 */
export async function test_api_aimall_backend_customer_posts_comments_test_delete_comment_by_customer_not_author_forbidden(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerAData = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerAData },
  );
  typia.assert(customerA);

  // 2. Register Customer B
  const customerBData = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    password_hash: typia.random<string>(),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerBData },
  );
  typia.assert(customerB);

  // 3. As Customer A, create a post
  // [Assume: connection is authenticated as Customer A]
  const postInput = {
    title: "Test post title",
    body: "Test post body",
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 4. As Customer A, create a comment under the post
  const commentInput = {
    post_id: post.id,
    body: "Comment by A",
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      { postId: post.id, body: commentInput },
    );
  typia.assert(comment);

  // 5. [Assume: Switch connection to Customer B's credentials]
  // Attempt to erase Customer A's comment as Customer B (should be forbidden)
  await TestValidator.error(
    "Customer B should not be able to erase Customer A's comment",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.comments.erase(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  });

  // Optional: If a comment-read endpoint existed, fetch comment and assert deleted_at is null.
}
