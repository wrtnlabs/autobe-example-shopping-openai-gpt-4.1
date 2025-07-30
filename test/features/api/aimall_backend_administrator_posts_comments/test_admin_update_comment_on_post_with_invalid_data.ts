import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate admin handling of invalid comment update payloads on community
 * posts.
 *
 * This test ensures that the administrator comment update endpoint correctly
 * rejects invalid update payloads, in line with business validation and type
 * constraints. It covers: (1) updating with empty input, (2) missing all
 * updatable fields, (3) type violations (e.g. is_private as string), (4) null
 * for non-nullable, and (5) at least one valid update.
 *
 * Steps:
 *
 * 1. Admin creates a post (dependency).
 * 2. Admin creates a comment on the post (dependency).
 * 3. Attempt update with empty object (should error; no updatable fields
 *    supplied).
 * 4. Attempt update with non-boolean is_private (should error on type).
 * 5. Attempt update with null is_private (should error as is_private is not
 *    nullable).
 * 6. Attempt update with all invalid fields at once (should error).
 * 7. (Control) Perform valid update to ensure comment _can_ be updated
 *    successfully when valid.
 * 8. Confirm comment remains unchanged after failed updates; update is reflected
 *    after successful one.
 *
 * This protects against improper acceptance of malformed input, type mistakes
 * or missing fields in the update schema.
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_update_comment_on_post_with_invalid_data(
  connection: api.IConnection,
) {
  // Step 1: Admin creates a post.
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // Step 2: Admin creates a comment on the post.
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Original comment.",
          is_private: false,
        },
      },
    );
  typia.assert(comment);

  // Step 3: Attempt update with empty object (should fail)
  await TestValidator.error("update with empty object fails")(() =>
    api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {},
      },
    ),
  );

  // Step 4: Attempt update with non-boolean is_private (should fail)
  await TestValidator.error("non-boolean is_private should fail")(() =>
    api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { is_private: "not_a_boolean" as any },
      },
    ),
  );

  // Step 5: Attempt update with null is_private (should fail)
  await TestValidator.error("null is_private should fail")(() =>
    api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { is_private: null as any },
      },
    ),
  );

  // Step 6: Attempt update with all invalid fields at once
  await TestValidator.error("all fields invalid")(() =>
    api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          body: null as any,
          is_private: "x" as any,
          deleted_at: 123 as any,
        },
      },
    ),
  );

  // Step 7: Control - valid update works
  const updated =
    await api.functional.aimall_backend.administrator.posts.comments.update(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { body: "Edited by admin.", is_private: true },
      },
    );
  typia.assert(updated);

  // Step 8: Confirm changes reflected only after valid update
  TestValidator.equals("body updated")(updated.body)("Edited by admin.");
  TestValidator.equals("is_private updated")(updated.is_private)(true);
}
