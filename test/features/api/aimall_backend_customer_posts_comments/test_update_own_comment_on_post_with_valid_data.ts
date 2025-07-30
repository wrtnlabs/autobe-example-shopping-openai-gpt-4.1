import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test updating a customer's own comment under a specific post with valid data.
 *
 * This function verifies the following workflow:
 *
 * 1. Customer creates a new post.
 * 2. Customer creates a comment under their own post.
 * 3. Customer updates that comment, modifying the body and is_private flag.
 * 4. The update is accepted; the returned comment reflects the correct changes.
 * 5. Audit (updated_at) is advanced after update.
 * 6. Handles edge cases: update rejected if the comment is missing or deleted
 *    (SKIP: not supported by current API set).
 */
export async function test_api_aimall_backend_customer_posts_comments_test_update_own_comment_on_post_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a post as the customer
  const post = await api.functional.aimall_backend.customer.posts.create(
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
  TestValidator.equals("post is not deleted")(post.deleted_at)(null);

  // 2. Write a comment under the created post
  const initialCommentBody = RandomGenerator.alphabets(20);
  const initialIsPrivate = false;
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: initialCommentBody,
          is_private: initialIsPrivate,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment is assigned to post")(comment.post_id)(post.id);
  TestValidator.equals("comment is not deleted")(comment.deleted_at)(null);
  TestValidator.equals("comment body matches")(comment.body)(
    initialCommentBody,
  );
  TestValidator.equals("comment is_private matches")(comment.is_private)(
    initialIsPrivate,
  );

  // 3. Update the comment body and is_private flag
  await new Promise((res) => setTimeout(res, 10)); // guarantee observable updated_at difference, if possible
  const updateBody = RandomGenerator.alphabets(30);
  const updateIsPrivate = true;
  const updatedComment =
    await api.functional.aimall_backend.customer.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: updateBody,
          is_private: updateIsPrivate,
        } satisfies IAimallBackendComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  TestValidator.equals("comment ID remains the same")(updatedComment.id)(
    comment.id,
  );
  TestValidator.equals("post_id remains the same")(updatedComment.post_id)(
    post.id,
  );
  TestValidator.equals("updated body reflected")(updatedComment.body)(
    updateBody,
  );
  TestValidator.equals("updated is_private reflected")(
    updatedComment.is_private,
  )(updateIsPrivate);
  TestValidator.predicate("updated_at advanced")(
    updatedComment.updated_at > comment.updated_at,
  );
  TestValidator.equals("deleted_at stays null")(updatedComment.deleted_at)(
    null,
  );
}
