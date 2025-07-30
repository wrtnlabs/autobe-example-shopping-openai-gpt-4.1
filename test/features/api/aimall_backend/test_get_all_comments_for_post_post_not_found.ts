import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling when retrieving comments for a non-existent post.
 *
 * Business requirement: The comments API should return a 404 or meaningful
 * error if the requested postId does not exist in the system. This test
 * attempts to retrieve comments for a random (presumed not to exist) UUID as
 * postId and asserts the error handling behavior.
 *
 * Steps:
 *
 * 1. Generate a random UUID to use as postId, which is not associated with any
 *    post in the system.
 * 2. Attempt to fetch comments for this postId via the customer comments endpoint.
 * 3. Validate that an error is thrown (404 Not Found or equivalent business error
 *    indicating missing post).
 * 4. (Edge) Ensure no successful response is returned with data.
 */
export async function test_api_aimall_backend_test_get_all_comments_for_post_post_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID not present in the system (assume typia.random() is enough for non-existence).
  const fakePostId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Try to fetch comments and expect an error to be thrown.
  await TestValidator.error(
    "Should return 404 or not found error for missing post",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.comments.index(
      connection,
      { postId: fakePostId },
    );
  });
}
