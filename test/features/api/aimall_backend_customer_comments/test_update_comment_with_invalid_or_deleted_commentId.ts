import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test handling of comment update attempts using invalid or soft-deleted
 * comment IDs.
 *
 * This E2E test validates that the API correctly handles the following error
 * scenario:
 *
 * 1. Attempt to update a comment using a random (nonexistent) UUID as commentId.
 *    The API should return not found or a meaningful error, confirming it
 *    gracefully handles requests to update comments that do not exist.
 *
 * The scenario of attempting to update an already soft-deleted comment cannot
 * be implemented due to lack of available API functions to create or
 * soft-delete a comment directly in this test. Thus, only the invalid UUID
 * scenario is tested.
 *
 * Steps:
 *
 * 1. Attempt to update a comment with a random UUID (that does not correspond to
 *    any existing comment).
 * 2. Verify that the API responds with a not found or appropriate error response,
 *    confirming correct behavior in the absence of the requested comment.
 */
export async function test_api_aimall_backend_customer_comments_test_update_comment_with_invalid_or_deleted_commentId(
  connection: api.IConnection,
) {
  // 1. Attempt updating a comment with a random (presumed non-existent) UUID
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  const invalidUpdatePayload: IAimallBackendComment.IUpdate = {
    body: "Trying to update a comment that does not exist",
    is_private: false,
  };
  await TestValidator.error(
    "Non-existent commentId should return not found error",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.update(connection, {
      commentId: invalidCommentId,
      body: invalidUpdatePayload,
    });
  });
}
