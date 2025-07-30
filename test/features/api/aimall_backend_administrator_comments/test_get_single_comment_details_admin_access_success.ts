import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that an administrator can retrieve full details of a single comment by
 * its ID, including fields for body, privacy (is_private), and soft-deletion
 * (deleted_at), as well as all schema-defined values (ownership, created_at,
 * updated_at, etc).
 *
 * This validates that admin GET access works and that sensitive/admin-only or
 * moderation fields are exposed as expected, including support for audit fields
 * and possible nullables.
 *
 * 1. Create a post as a container for the comment (customer role)
 * 2. Create a comment on that post (customer role)
 * 3. Retrieve the comment as administrator using its ID
 * 4. Assert that the response matches all fields defined in IAimallBackendComment,
 *    including correct values for body, is_private, and deleted_at, and
 *    presence of every schema field.
 */
export async function test_api_aimall_backend_administrator_comments_test_get_single_comment_details_admin_access_success(
  connection: api.IConnection,
) {
  // 1. Create a post (customer role, basic data)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Create a comment for the post (customer role)
  const comment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(1),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);

  // 3. Retrieve comment as administrator by ID
  const detailed =
    await api.functional.aimall_backend.administrator.comments.at(connection, {
      commentId: comment.id,
    });
  typia.assert(detailed);

  // 4. Assert schema-defined fields are present and match on key fields
  TestValidator.equals("comment id matches")(detailed.id)(comment.id);
  TestValidator.equals("post id matches")(detailed.post_id)(post.id);
  TestValidator.equals("body matches")(detailed.body)(comment.body);
  TestValidator.equals("privacy flag matches")(detailed.is_private)(
    comment.is_private,
  );
  TestValidator.equals("soft delete null")(detailed.deleted_at)(null);

  // Check fields required by schema are present
  [
    "id",
    "post_id",
    "review_id",
    "parent_id",
    "customer_id",
    "body",
    "is_private",
    "created_at",
    "updated_at",
    "deleted_at",
  ].forEach((field) => {
    if (!(field in detailed))
      throw new Error(
        `Missing schema field '${field}' in admin comment response`,
      );
  });
}
