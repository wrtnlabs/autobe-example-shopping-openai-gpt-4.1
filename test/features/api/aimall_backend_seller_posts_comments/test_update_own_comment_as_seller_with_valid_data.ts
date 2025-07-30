import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E test that ensures a seller can update their own comment fields on a post.
 *
 * Preconditions:
 *
 * 1. A seller creates a post (ensuring author privileges)
 * 2. The seller comments on this post Flow:
 * 3. Seller attempts to update the comment's body and is_private fields
 * 4. The API returns the updated comment entity, and the changes reflect in atomic
 *    fields
 *
 * Test Steps:
 *
 * 1. Create a post as a seller
 * 2. Add an initial comment as the seller
 * 3. Use the update API to modify the comment's body and is_private flag (toggle
 *    privacy)
 * 4. Verify the API response includes updated values and correct metadata
 * 5. Validate that the comment id, post id, and unchanged fields are preserved,
 *    and changed fields (body, is_private, updated_at) are updated
 */
export async function test_api_aimall_backend_seller_posts_comments_test_update_own_comment_as_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a post as seller
  const postBody: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 2. Create initial comment on the post
  const commentBody: IAimallBackendComment.ICreate = {
    post_id: post.id,
    body: "Initial seller comment for edit test.",
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const comment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);
  TestValidator.equals("linked post id")(comment.post_id)(post.id);
  TestValidator.equals("initial comment body")(comment.body)(
    "Initial seller comment for edit test.",
  );

  // 3. Seller updates comment body and privacy flag
  const updateBody: IAimallBackendComment.IUpdate = {
    body: "Edited comment by seller.",
    is_private: true,
  } satisfies IAimallBackendComment.IUpdate;
  const updated =
    await api.functional.aimall_backend.seller.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate fields
  TestValidator.equals("comment id unchanged")(updated.id)(comment.id);
  TestValidator.equals("post id unchanged")(updated.post_id)(post.id);
  TestValidator.equals("body updated")(updated.body)(
    "Edited comment by seller.",
  );
  TestValidator.equals("privacy flag updated")(updated.is_private)(true);
  TestValidator.notEquals("updated_at is changed")(updated.updated_at)(
    comment.updated_at,
  );
}
