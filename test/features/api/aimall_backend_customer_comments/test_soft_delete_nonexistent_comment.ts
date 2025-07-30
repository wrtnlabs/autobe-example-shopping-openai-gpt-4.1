import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validates that attempting to soft-delete (logically delete) a non-existent
 * comment returns a not found error.
 *
 * Business rationale: Logical (soft) deletion of comments is restricted by
 * comment existence; attempting to delete a non-existent comment should return
 * a not found error for compliance reasons and prevent leaking information
 * about deleted resources.
 *
 * Steps:
 *
 * 1. Generate a random UUID (commentId) that does not exist in the database
 * 2. Call the soft-delete API for customer comments with the random UUID
 * 3. Assert that a not-found error is thrown (as deletion cannot be performed for
 *    a missing resource)
 */
export async function test_api_aimall_backend_customer_comments_test_soft_delete_nonexistent_comment(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a comment that does not exist
  const nonExistentCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to soft-delete the non-existent commentId
  await TestValidator.error(
    "Should throw not found error for missing commentId",
  )(() =>
    api.functional.aimall_backend.customer.comments.erase(connection, {
      commentId: nonExistentCommentId,
    }),
  );
}
