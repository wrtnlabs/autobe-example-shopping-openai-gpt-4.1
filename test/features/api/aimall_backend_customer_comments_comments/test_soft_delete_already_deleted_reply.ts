import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate behavior for repeated soft-deletion of a reply comment.
 *
 * This test verifies that attempting to soft-delete a child comment (reply) a
 * second time results in a proper error response and no additional state
 * changes occur. Business context: Soft-deletion should be idempotent; once a
 * reply is deleted (deleted_at is set), further deletion attempts should be
 * rejected.
 *
 * Steps:
 *
 * 1. Create a parent comment (root thread comment).
 * 2. Create a child comment (reply) under that parent comment.
 * 3. Soft-delete the child comment (should succeed).
 * 4. Attempt to soft-delete the same child comment again.
 *
 *    - Should throw an error (ideally 404 or business-relevant error message about
 *         already-deleted content).
 *    - No additional state change should occur (the comment remains soft-deleted).
 */
export async function test_api_aimall_backend_customer_comments_comments_test_soft_delete_already_deleted_reply(
  connection: api.IConnection,
) {
  // 1. Create parent comment
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        review_id: null,
        parent_id: null,
        body: "Parent comment for test.",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create child/reply comment
  const childComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: parentComment.post_id ?? null,
          review_id: parentComment.review_id ?? null,
          parent_id: parentComment.id,
          body: "Child (reply) comment for soft-delete test.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 3. First soft-delete (should succeed)
  await api.functional.aimall_backend.customer.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: childComment.id,
    },
  );

  // 4. Second soft-delete attempt (should fail)
  await TestValidator.error(
    "Deleting already-deleted child comment should fail",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.comments.erase(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
      },
    );
  });
}
