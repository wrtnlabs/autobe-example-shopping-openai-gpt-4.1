import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate proper error handling when an administrator attempts to update a
 * nonexistent comment.
 *
 * This test ensures the system returns the correct not-found error when trying
 * to update a comment by UUID that does not exist in the
 * aimall_backend_comments table. It is a negative test case designed to ensure
 * that the update operation does not accidentally create new records or
 * silently fail—robust error handling for missing resources is required for
 * administrative auditability and correctness.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is not associated with any existing comment
 *    (simulate with a value guaranteed to not exist).
 * 2. Compose a valid update DTO (body or privacy flag—contents don't matter since
 *    the comment doesn't exist).
 * 3. Call the administrator comments.update endpoint with the nonexistent UUID.
 * 4. Assert that an error is thrown and verify that it's a not-found error
 *    (typically HTTP 404 or business-specific code).
 */
export async function test_api_aimall_backend_administrator_comments_test_update_nonexistent_comment_by_admin(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent comment
  const nonExistentCommentId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Compose a minimal valid update DTO
  const updateDto: IAimallBackendComment.IUpdate = {
    body: "Attempted update to non-existent comment.",
    is_private: false,
  };

  // 3. Attempt to update the comment as admin and expect error
  await TestValidator.error("Should fail with not-found error")(async () => {
    await api.functional.aimall_backend.administrator.comments.update(
      connection,
      {
        commentId: nonExistentCommentId,
        body: updateDto,
      },
    );
  });
}
