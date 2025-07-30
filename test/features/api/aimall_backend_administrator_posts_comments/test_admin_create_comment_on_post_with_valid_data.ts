import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that an administrator can create a comment on any community post
 * with all required and optional fields.
 *
 * Business Context: Administrators need to be able to comment on any post for
 * moderation, support, or engagement purposes. Comments may be public or
 * private and are tied to particular posts via postId. The system should audit
 * every comment with timestamps and other metadata.
 *
 * Steps:
 *
 * 1. Create a post as an administrator (to ensure the post exists and obtain its
 *    id).
 * 2. As an administrator, post a comment on that post: a. Provide both required
 *    (body, is_private) and optional (post_id, parent_id, review_id) fields. b.
 *    Ensure the comment links to the post (post_id = created post.id).
 * 3. Validate the response:
 *
 *    - The returned comment object should match the request data.
 *    - Audit fields (created_at, updated_at) are filled.
 *    - Post_id field of the comment should match the id of the created post.
 *    - If parent_id and review_id are not set, they should be null or undefined.
 *    - Is_private should be as set in the request.
 *    - Body should match the request body.
 *    - Id and audit fields should have correct formats (UUID, date-time).
 * 4. Negative Test: Try comment creation with required fields missing; should fail
 *    (skipped due to TypeScript constraint).
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_create_comment_on_post_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const postInput = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Prepare comment input with all possible fields (parent_id, review_id omitted: root comment)
  const commentInput = {
    post_id: post.id,
    parent_id: null,
    review_id: null,
    body: RandomGenerator.content()()(),
    is_private: true,
  } satisfies IAimallBackendComment.ICreate;
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentInput,
      },
    );
  typia.assert(comment);

  // 3. Validate comment fields
  TestValidator.equals("comment.post_id matches post.id")(comment.post_id)(
    post.id,
  );
  TestValidator.equals("comment.body matches")(comment.body)(commentInput.body);
  TestValidator.equals("comment.is_private matches")(comment.is_private)(
    commentInput.is_private,
  );
  TestValidator.predicate("id is a UUID")(
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate("created_at is ISO8601")(
    !!Date.parse(comment.created_at),
  );
  TestValidator.predicate("updated_at is ISO8601")(
    !!Date.parse(comment.updated_at),
  );
  TestValidator.equals("deleted_at is null or undefined")(comment.deleted_at)(
    null,
  );
  TestValidator.equals("review_id is null or undefined")(comment.review_id)(
    null,
  );
  TestValidator.equals("parent_id is null or undefined")(comment.parent_id)(
    null,
  );
}
