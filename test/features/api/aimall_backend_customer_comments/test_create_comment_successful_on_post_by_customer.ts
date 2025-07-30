import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a logged-in customer can create a new comment on a post.
 *
 * This test ensures that an authenticated customer can successfully create a
 * comment on a post, and verifies that all schema and business requirements are
 * met. It checks required fields, correct associations, and response
 * integrity.
 *
 * Steps:
 *
 * 1. Create a new post as an authenticated customer (precondition)
 * 2. Create a comment referring to the new post
 * 3. Assert that the response object matches the sent data, that the post is
 *    correctly linked, customer_id is populated, and timestamps are present
 */
export async function test_api_aimall_backend_customer_comments_test_create_comment_successful_on_post_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a new post as authenticated customer (prerequisite for comment)
  const postInput = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(2),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Create a comment referencing the created post
  const commentInput = {
    post_id: post.id,
    review_id: null,
    parent_id: null,
    body: RandomGenerator.paragraph()(1),
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: commentInput,
    },
  );
  typia.assert(comment);

  // 3. Validate echoed and association fields in the returned comment
  TestValidator.equals("body echoed")(comment.body)(commentInput.body);
  TestValidator.equals("is_private echoed")(comment.is_private)(
    commentInput.is_private,
  );
  TestValidator.equals("linked post")(comment.post_id)(post.id);
  TestValidator.predicate("customer_id present")(
    typeof comment.customer_id === "string" && comment.customer_id.length > 0,
  );
  TestValidator.predicate("has timestamps")(
    typeof comment.created_at === "string" &&
      typeof comment.updated_at === "string",
  );
}
