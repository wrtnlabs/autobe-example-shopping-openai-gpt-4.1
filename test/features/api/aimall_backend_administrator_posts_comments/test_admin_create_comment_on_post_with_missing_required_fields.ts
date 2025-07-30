import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate API error handling when required comment creation fields are omitted
 * or invalid during administrator comment creation under a post.
 *
 * This test ensures that the backend enforces mandatory field validation for
 * comment creation and reliably returns informative validation errors, rather
 * than allowing incomplete records or ambiguous failures.
 *
 * Workflow:
 *
 * 1. First, create a new post as an administrator (to obtain a valid postId).
 * 2. Attempt to create a new comment for that post with invalid combinations of
 *    required fields (where possible within TypeScript type safety, i.e., with
 *    empty/blank values or direct runtime runtime errors – _not_ compilation
 *    errors from missing required fields).
 *
 *    - Test with blank string for body (should fail runtime business validation if
 *         empty is not acceptable).
 *    - Skip attempts to truly omit required fields because that is not type-safe and
 *         cannot be implemented.
 * 3. Confirm that the API responds with a runtime error, and that error details
 *    clearly identify the validation failure (only test error occurrence, not
 *    message content).
 * 4. Control: assert that a valid comment creation does succeed.
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_admin_create_comment_on_post_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator (dependency setup)
  const post = await api.functional.aimall_backend.administrator.posts.create(
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

  // 2. Attempt to create a comment with empty string for body (runtime validation)
  await TestValidator.error("empty comment body should fail")(async () => {
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  });

  // 3. Control: Create a valid comment (should succeed)
  const comment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "A valid comment for control",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment);
  TestValidator.equals("comment body")(comment.body)(
    "A valid comment for control",
  );
  TestValidator.equals("comment is_private")(comment.is_private)(false);
}
