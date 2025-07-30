import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling for deleting a nonexistent child comment as
 * administrator
 *
 * This test ensures that when an administrator attempts to soft-delete (logical
 * delete) a reply (child comment) under a parent comment thread, using a random
 * UUID for the childCommentId (which does not exist), the API returns the
 * expected 404 Not Found error and no comment data is affected.
 *
 * Business context:
 *
 * - In the aimall community, comments can be nested. Administrative delete
 *   operations must follow audit/compliance requirements (soft deletion).
 * - The test must first create a root (parent) comment to serve as the target
 *   thread, authenticating as a customer since only customers can create
 *   comments.
 * - The DELETE attempt is then made by the administrator on a random non-existent
 *   childCommentId under the real parentId.
 * - The response must be validated: 404 Not Found is expected and no silent
 *   success or wrong status is allowed.
 *
 * Step-by-step:
 *
 * 1. Create a parent comment as customer (using POST
 *    /aimall-backend/customer/comments)
 * 2. As administrator, call DELETE
 *    /aimall-backend/administrator/comments/{commentId}/comments/{childCommentId}
 *    with:
 *
 *    - CommentId: real parent comment id
 *    - ChildCommentId: random UUID (guaranteed not to exist under parent)
 * 3. Validate an error is thrown (use TestValidator.error) indicating 404 Not
 *    Found.
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_soft_delete_reply_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Create parent comment as customer (note: business requires customer context for comment creation)
  const parentBody: IAimallBackendComment.ICreate = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
    // No parent_id, post_id, review_id: create as standalone comment
  };
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: parentBody,
    });
  typia.assert(parentComment);

  // 2. As admin, attempt to soft-delete a nonexistent child comment (random UUID)
  const nonExistingChildCommentId = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "should fail to soft-delete nonexistent child reply",
  )(async () => {
    await api.functional.aimall_backend.administrator.comments.comments.erase(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: nonExistingChildCommentId,
      },
    );
  });
}
