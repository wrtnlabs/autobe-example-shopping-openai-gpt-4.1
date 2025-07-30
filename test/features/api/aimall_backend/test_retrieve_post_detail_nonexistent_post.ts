import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate error handling for retrieval of non-existent or soft-deleted post
 * details.
 *
 * Ensures that attempting to access the detail of a post that does not exist,
 * or which has been soft deleted, results in an error (typically 404) and does
 * not leak any sensitive or deleted post data. This protects community privacy
 * rules and integrity of deleted content.
 *
 * Steps:
 *
 * 1. Attempt to fetch a post detail with a completely random (non-existent)
 *    postId.
 *
 *    - Expect an error.
 * 2. Create a real post as a customer and then soft-delete it.
 * 3. Attempt to fetch the post detail for the deleted postId.
 *
 *    - Expect an error.
 * 4. Confirm that in both cases no sensitive or deleted data is leaked and that
 *    TestValidator.error correctly traps the error responses.
 */
export async function test_api_aimall_backend_test_retrieve_post_detail_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Attempt to fetch a non-existent post (random UUID)
  const nonexistentPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Should fail for completely non-existent post")(
    async () => {
      await api.functional.aimall_backend.posts.at(connection, {
        postId: nonexistentPostId,
      });
    },
  );

  // 2. Create a new post
  const newPost = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "Test for soft-delete",
        body: "Body for a post that will be deleted.",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(newPost);

  // 3. Soft-delete the just-created post
  await api.functional.aimall_backend.customer.posts.erase(connection, {
    postId: newPost.id,
  });

  // 4. Try to fetch the deleted post's detail (should fail / 404)
  await TestValidator.error("Should fail for soft-deleted post")(async () => {
    await api.functional.aimall_backend.posts.at(connection, {
      postId: newPost.id,
    });
  });
}
