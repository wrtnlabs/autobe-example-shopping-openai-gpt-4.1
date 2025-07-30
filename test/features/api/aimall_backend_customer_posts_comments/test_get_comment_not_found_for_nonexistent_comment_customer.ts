import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling for retrieving a non-existent comment under an
 * existing post (customer role).
 *
 * This test ensures that querying a commentId that does not exist under a valid
 * postId returns a proper not found (404) error response.
 *
 * Test Steps:
 *
 * 1. Create a valid post as a customer (setup dependency to obtain valid postId)
 * 2. Generate a random UUID for the commentId (guaranteed not associated with the
 *    created post)
 * 3. Attempt to GET the comment using the valid postId but the random,
 *    non-existent commentId
 * 4. Confirm that a 404 error is thrown and is handled correctly by the API layer
 *    (TestValidator.error)
 */
export async function test_api_aimall_backend_customer_posts_comments_test_get_comment_not_found_for_nonexistent_comment_customer(
  connection: api.IConnection,
) {
  // 1. Create a valid community post (dependency setup)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Generate a random UUID for commentId that does not exist
  const unknownCommentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Perform GET for the non-existent comment under the valid post
  await TestValidator.error("should return 404 for non-existent comment")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.at(
        connection,
        {
          postId: post.id,
          commentId: unknownCommentId,
        },
      );
    },
  );
}
