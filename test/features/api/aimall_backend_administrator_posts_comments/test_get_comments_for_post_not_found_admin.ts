import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that the API returns a not found error when an administrator
 * attempts to list comments for a non-existent postId.
 *
 * This test ensures that requesting comments for a postId that does not exist
 * does not leak any data and the system returns an appropriate error (such as
 * 404 not found).
 *
 * Steps:
 *
 * 1. Generate a random UUID for postId that is guaranteed not to exist in the
 *    system (since it is randomly generated for test isolation).
 * 2. Attempt to fetch comments for this postId as an administrator using the API
 *    endpoint.
 * 3. Assert that an error is thrown, and that no comment data is returned (i.e.,
 *    no data leakage occurs).
 * 4. Optionally, ensure the error is a not found (404) or business-not-found
 *    semantic.
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_get_comments_for_post_not_found_admin(
  connection: api.IConnection,
) {
  // Step 1. Generate a non-existent postId
  const nonExistentPostId = typia.random<string & tags.Format<"uuid">>();

  // Step 2. Attempt to fetch comments for this random postId
  await TestValidator.error(
    "should throw 404 not found when postId does not exist",
  )(async () => {
    // The endpoint should throw an error for not found
    await api.functional.aimall_backend.administrator.posts.comments.index(
      connection,
      { postId: nonExistentPostId },
    );
  });
}
