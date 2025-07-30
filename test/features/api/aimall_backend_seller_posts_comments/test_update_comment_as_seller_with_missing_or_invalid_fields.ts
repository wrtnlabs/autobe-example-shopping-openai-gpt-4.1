import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test seller post comment update validation error handling.
 *
 * This test ensures that when a seller tries to update a comment for their
 * post, but provides an invalid payload (missing required fields, blank body,
 * wrong is_private type), the API responds with an appropriate validation error
 * and does not update the comment.
 *
 * Steps:
 *
 * 1. Create a post as a seller.
 * 2. Create a comment on the post as a seller.
 * 3. Attempt to update the comment with:
 *
 *    - A completely empty update object (should fail)
 *    - An explicitly blank body (should fail)
 *    - Is_private provided as a string, not boolean (should fail)
 * 4. Assert the API rejects each invalid update attempt with a validation error.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_update_comment_as_seller_with_missing_or_invalid_fields(
  connection: api.IConnection,
) {
  // 1. Create a post as seller
  const post = await api.functional.aimall_backend.seller.posts.create(
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

  // 2. Create a comment as seller
  const comment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a valid comment for update validation tests.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Attempt to update the comment with invalid payloads -------------------
  // 3.a. Empty update object (should fail: must provide at least one updatable field)
  await TestValidator.error("update with empty object fails")(() =>
    api.functional.aimall_backend.seller.posts.comments.update(connection, {
      postId: post.id,
      commentId: comment.id,
      body: {},
    }),
  );

  // 3.b. Blank body (should fail: body cannot be empty string)
  await TestValidator.error("update with blank body string fails")(() =>
    api.functional.aimall_backend.seller.posts.comments.update(connection, {
      postId: post.id,
      commentId: comment.id,
      body: { body: "" },
    }),
  );

  // 3.c. Non-boolean is_private (should fail: must be boolean, not string)
  // Forcing an invalid type via runtime (simulates client-side JSON user error)
  await TestValidator.error("update with is_private as string fails")(() =>
    api.functional.aimall_backend.seller.posts.comments.update(connection, {
      postId: post.id,
      commentId: comment.id,
      body: { is_private: "not-a-bool" as unknown as boolean },
    }),
  );
}
