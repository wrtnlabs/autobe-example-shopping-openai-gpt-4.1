import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling when an administrator attempts to update a
 * non-existent child comment.
 *
 * This test verifies that the system robustly reports a 'not found' error (404)
 * when trying to perform an edit operation on a child commentId which does not
 * exist under a valid parent commentId. This kind of validation is important to
 * prevent administrative operations from acting on invalid or maliciously
 * constructed comment hierarchies.
 *
 * Step-by-step process:
 *
 * 1. Create a valid parent comment as a customer to use as the parent (commentId).
 * 2. Attempt to update a child comment using a random, non-existent UUID as the
 *    childCommentId (ensuring it is not actually linked under the parent or
 *    possibly does not exist at all).
 * 3. Assert that the system returns a 404 not found error to confirm robust error
 *    reporting.
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_cannot_update_nonexistent_child_comment(
  connection: api.IConnection,
) {
  // 1. Create a valid parent comment as a customer
  const parentComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: "Parent for error test",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Attempt to update a non-existent child commentId under the valid parent
  const nonExistentChildId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("404 on non-existent child comment")(() =>
    api.functional.aimall_backend.administrator.comments.comments.update(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: nonExistentChildId,
        body: {
          body: "Should not succeed",
        } satisfies IAimallBackendComment.IUpdate,
      },
    ),
  );
}
