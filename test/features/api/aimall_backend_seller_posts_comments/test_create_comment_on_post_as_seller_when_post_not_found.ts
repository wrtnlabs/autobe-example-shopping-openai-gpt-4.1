import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate rejection when creating a comment as a seller on a non-existent
 * post.
 *
 * This test ensures that the API responds with an error when a seller attempts
 * to add a comment to a post that does not exist or is inaccessible. The
 * typical scenario is when the seller (authenticated) tries to target a random
 * or deleted postId.
 *
 * Steps:
 *
 * 1. Generate a random, guaranteed non-existent postId (UUID).
 * 2. Prepare a valid comment creation DTO that targets this missing postId, using
 *    realistic content and flags.
 * 3. Attempt to call the API's comment creation endpoint for this post.
 * 4. Validate that an error is thrown using TestValidator.error, confirming proper
 *    error handling by the API (no comment should be created).
 */
export async function test_api_aimall_backend_seller_posts_comments_test_create_comment_on_post_as_seller_when_post_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random non-existent postId (UUID)
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Prepare valid comment creation data
  const commentInput: IAimallBackendComment.ICreate = {
    post_id: nonExistentPostId,
    review_id: null,
    parent_id: null,
    body: "This is a test comment targeting a missing post.",
    is_private: false,
  };

  // 3. Attempt API call and assert that error is thrown
  await TestValidator.error(
    "should not allow comment creation on a non-existent postId",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: nonExistentPostId,
        body: commentInput,
      },
    );
  });
}
