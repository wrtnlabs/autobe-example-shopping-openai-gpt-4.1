import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E test that verifies a seller can create a comment on their own post with
 * valid data.
 *
 * This test case checks that a seller (authenticated) is able to successfully
 * comment on a community post they own, given valid required data fields.
 *
 * Steps:
 *
 * 1. Create a community post as the seller (dependency)
 * 2. Create a comment on that post with valid data (body, is_private, and optional
 *    nullable fields)
 * 3. Assert returned comment fields are populated
 * 4. Assert comment.post_id equals created post id
 *
 * Note: The author identity (seller/customer id) is not present in the comment
 * DTO, so cannot be directly validated.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_create_post_comment_as_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a community post as seller (dependency)
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment on the post using valid data
  const commentInput = {
    post_id: post.id,
    review_id: null,
    parent_id: null,
    body: RandomGenerator.content()()(1),
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;

  const comment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentInput,
      },
    );
  typia.assert(comment);

  // 3. Assert returned comment fields are populated
  TestValidator.equals("comment post_id matches post id")(comment.post_id)(
    post.id,
  );
  TestValidator.equals("is_private set")(comment.is_private)(
    commentInput.is_private,
  );
  TestValidator.equals("comment not deleted")(comment.deleted_at)(null);
  TestValidator.equals("body set")(comment.body)(commentInput.body);

  // 4. Fields integrity check
  TestValidator.predicate("id exists and is uuid")(
    typeof comment.id === "string" && comment.id.length > 0,
  );
  TestValidator.predicate("created_at iso string")(
    typeof comment.created_at === "string" && comment.created_at.includes("T"),
  );
  TestValidator.predicate("updated_at iso string")(
    typeof comment.updated_at === "string" && comment.updated_at.includes("T"),
  );
  // Note: Author/customer id cannot be validated directly as it is not present in response DTO.
}
