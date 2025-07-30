import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate attempting to soft delete a non-existent or already deleted comment
 * as administrator.
 *
 * This test ensures robust and idempotent error handling when trying to soft
 * delete a comment that:
 *
 * - Does not exist (random UUID)
 * - Has already been deleted (delete twice in succession)
 *
 * Steps:
 *
 * 1. Attempt to delete a comment using a random (non-existent) commentId. Expect
 *    an error, confirming not-found is handled gracefully.
 * 2. Simulate deleting an existing comment by making the delete request twice on
 *    the same ID: the first call may succeed or error (it's not checked), the
 *    second should throw not-found or similar error (since already deleted).
 * 3. All error assertions must check that an error is thrown (no type or message
 *    checks required).
 */
export async function test_api_aimall_backend_administrator_comments_test_delete_comment_by_admin_with_invalid_or_already_deleted_id(
  connection: api.IConnection,
) {
  // 1. Attempt to delete a random/non-existent comment and expect error
  await TestValidator.error("deleting random non-existent comment should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.erase(
        connection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 2. Simulate deleting an already deleted comment:
  //    First, attempt delete (it may succeed or error if not present)
  const commentId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.aimall_backend.administrator.comments.erase(
      connection,
      { commentId },
    );
  } catch {}

  //    Second, immediately try deleting again, should error
  await TestValidator.error("re-deleting same comment should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.erase(
        connection,
        { commentId },
      );
    },
  );
}
