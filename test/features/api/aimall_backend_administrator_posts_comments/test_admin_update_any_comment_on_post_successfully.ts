import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that an administrator can update any comment on a post regardless of
 * comment authorship.
 *
 * Ensures admin privilege overrides, and business rules for comment updating
 * and auditing are maintained.
 *
 * Steps:
 *
 * 1. Admin creates a post (using the administrator post creation endpoint).
 * 2. Seller user (not the admin) creates a comment on that post (using the
 *    seller's comment creation endpoint).
 * 3. Admin prepares an update payload for the comment (e.g., new "body" text,
 *    toggled "is_private" flag).
 * 4. Admin updates the seller's comment on the post using the admin update
 *    endpoint.
 * 5. Validate that the returned comment reflects the changes and audit fields
 *    (updated_at) is chronologically after original, and all required business
 *    logic is enforced.
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_update_any_comment_on_post_successfully(
  connection: api.IConnection,
) {
  // 1. Admin creates a post
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Seller creates a comment on the post
  // (If role switching is required, the test harness must provide this context)
  const commentInput: IAimallBackendComment.ICreate = {
    post_id: post.id,
    body: RandomGenerator.paragraph()(1),
    is_private: false,
  };
  const sellerComment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentInput,
      },
    );
  typia.assert(sellerComment);

  // 3. Prepare valid update data
  const updateInput: IAimallBackendComment.IUpdate = {
    body: RandomGenerator.paragraph()(1) + " (updated)",
    is_private: true,
  };
  const createdAt = sellerComment.created_at;
  const oldUpdatedAt = sellerComment.updated_at;

  // 4. Admin updates the seller's comment
  const updatedComment =
    await api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: sellerComment.id,
        body: updateInput,
      },
    );
  typia.assert(updatedComment);

  // 5. Assert business logic: updated fields, audit trail, and author
  TestValidator.equals("comment body updated")(updatedComment.body)(
    updateInput.body,
  );
  TestValidator.equals("privacy updated")(updatedComment.is_private)(
    updateInput.is_private,
  );
  TestValidator.equals("post id unchanged")(updatedComment.post_id)(post.id);
  TestValidator.predicate("updated_at advanced")(
    Date.parse(updatedComment.updated_at) > Date.parse(oldUpdatedAt),
  );
  TestValidator.equals("created_at unchanged")(updatedComment.created_at)(
    createdAt,
  );
  TestValidator.equals("author unchanged")(updatedComment.customer_id)(
    sellerComment.customer_id,
  );
}
