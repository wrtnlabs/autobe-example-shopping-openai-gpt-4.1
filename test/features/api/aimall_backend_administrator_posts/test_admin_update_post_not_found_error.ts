import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test updating a post as an administrator with a non-existent postId.
 *
 * This test ensures that when an administrator attempts to update a community
 * post with an ID that does not exist in the database, the API returns a not
 * found error and no content is created or changed.
 *
 * Steps:
 *
 * 1. Prepare a random UUID guaranteed to not exist as postId.
 * 2. Attempt to update the post as an administrator using this postId, passing a
 *    valid update body (e.g., changed title, body, etc.).
 * 3. Expect the API to throw a not found error or equivalent.
 * 4. Assert that no post is returned and the HTTP error is appropriate.
 */
export async function test_api_aimall_backend_administrator_posts_test_admin_update_post_not_found_error(
  connection: api.IConnection,
) {
  // 1. Prepare a random UUID for non-existent postId
  const nonexistentPostId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare a valid update body
  const updateBody: IAimallBackendPost.IUpdate = {
    title: "Edited title - attempt on nonexistent post",
    body: "This content is an attempt to edit a non-existent post.",
    is_private: false,
  };

  // 3. Attempt the update and expect a not found error
  await TestValidator.error("should throw not found for nonexistent post")(
    async () => {
      await api.functional.aimall_backend.administrator.posts.update(
        connection,
        {
          postId: nonexistentPostId,
          body: updateBody,
        },
      );
    },
  );
}
