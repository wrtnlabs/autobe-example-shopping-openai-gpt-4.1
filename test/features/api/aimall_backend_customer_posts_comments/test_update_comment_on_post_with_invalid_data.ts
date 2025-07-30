import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test rejection of invalid comment update attempts on a post (validation
 * scenario).
 *
 * This test validates that the comment update endpoint properly rejects invalid
 * update payloads—such as empty strings for required fields or illegal
 * types—providing robust validation and business rule enforcement.
 *
 * **Test steps:**
 *
 * 1. Create a post as a customer (dependency)
 * 2. Create a comment under the created post as a customer (dependency)
 * 3. Attempt to update the comment with invalid values (empty body, or body as
 *    illegal data type)
 * 4. Assert that the API rejects each invalid update with a validation error
 *    (TestValidator.error)
 */
export async function test_api_aimall_backend_customer_posts_comments_test_update_comment_on_post_with_invalid_data(
  connection: api.IConnection,
) {
  // 1. Create a post as a customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment as a customer under the post
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph()(2),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Attempt to update the comment with invalid values -- (a) empty string body
  await TestValidator.error("Should reject empty string body during update")(
    () =>
      api.functional.aimall_backend.customer.posts.comments.update(connection, {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: "",
        } satisfies IAimallBackendComment.IUpdate,
      }),
  );

  // 4. Attempt to update with an illegal data type for body (number instead of string)
  // NOTE: This purposely uses 'as any' to force a runtime validation error. This is only acceptable for negative-path testing of validator logic and never for normal flows.
  await TestValidator.error("Should reject number as body")(() =>
    api.functional.aimall_backend.customer.posts.comments.update(connection, {
      postId: post.id,
      commentId: comment.id,
      body: {
        body: 1234 as any,
      } as any,
    }),
  );

  // 5. Attempt to update with all fields missing
  await TestValidator.error("Should reject update when no fields are present")(
    () =>
      api.functional.aimall_backend.customer.posts.comments.update(connection, {
        postId: post.id,
        commentId: comment.id,
        body: {} as IAimallBackendComment.IUpdate,
      }),
  );
}
