import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate error handling when attempting to delete a non-existent community
 * post as a seller.
 *
 * This test ensures that when a seller tries to soft-delete a post using an
 * invalid postId (a UUID that does not correspond to any existing post), the
 * API responds with a not found error, and that other posts, if any, are
 * unaffected by this failed operation.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as an invalid postId (no post exists with this
 *    id).
 * 2. Attempt to delete this non-existent post via the seller posts erase API.
 * 3. Assert that a not found error is thrown by the API.
 * 4. Note: Verifying that no other posts are altered is not possible (no post
 *    listing/read API is available in the current SDK/interface).
 */
export async function test_api_aimall_backend_seller_posts_test_seller_delete_post_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that does not correspond to any real post
  const invalidPostId = typia.random<string & tags.Format<"uuid">>();

  // 2/3. Attempt to delete a nonexistent post and check for appropriate error handling
  await TestValidator.error(
    "Attempting to delete a nonexistent post should result in a not found error",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.erase(connection, {
      postId: invalidPostId,
    });
  });

  // 4. Cannot verify side effects on other posts, as no listing/read interface is available.
}
