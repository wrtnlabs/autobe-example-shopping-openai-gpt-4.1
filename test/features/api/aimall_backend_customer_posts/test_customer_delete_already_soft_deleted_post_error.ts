import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate error when attempting to delete a post that has already been soft
 * deleted.
 *
 * Ensures that once a community post is soft deleted, the system will not allow
 * a second deletion. This demonstrates protection against redundant deletions
 * and guarantees soft-delete status is idempotent.
 *
 * Business steps:
 *
 * 1. Create a new post as the customer.
 * 2. Soft delete the post (deleted_at set).
 * 3. Attempt to soft delete again — expect error, and verify status remains
 *    unchanged.
 *
 * As there is no endpoint to retrieve a single post by ID for a customer, we
 * are unable to validate the deleted_at value after the failed deletion
 * attempt. Only the error response itself can be checked as evidence of correct
 * system behavior.
 */
export async function test_api_aimall_backend_customer_posts_test_customer_delete_already_soft_deleted_post_error(
  connection: api.IConnection,
) {
  // 1. Create a new post normally as a customer
  const createInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: createInput },
  );
  typia.assert(post);

  // 2. Soft delete it (first, valid deletion)
  await api.functional.aimall_backend.customer.posts.erase(connection, {
    postId: post.id,
  });

  // 3. Attempt to soft delete again — must result in error
  await TestValidator.error("deleting twice is not allowed")(async () => {
    await api.functional.aimall_backend.customer.posts.erase(connection, {
      postId: post.id,
    });
  });
}
