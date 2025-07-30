import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that accessing a soft-deleted child comment under a specific parent
 * returns not found.
 *
 * This test ensures that once a comment reply (child) is soft-deleted under
 * audit/compliance policy, it is no longer accessible via the API and returns a
 * not-found error. This protects thread visibility and audit trail
 * requirements.
 *
 * Workflow:
 *
 * 1. Create a root parent comment.
 * 2. Create a reply (child) comment beneath the parent.
 * 3. Soft-delete the child comment (logical, not hard delete).
 * 4. Attempt to retrieve the soft-deleted child via the proper endpoint.
 * 5. Assert that NOT FOUND is returned (error thrown), validating invisible state
 *    for deleted threads.
 */
export async function test_api_aimall_backend_test_get_child_comment_soft_deleted_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Create a root/parent comment
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: "Test parent comment for soft-deletion child retrieval",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create a child (reply) comment
  const childComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          body: "Test child reply to be soft deleted",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 3. Soft-delete the child reply (logical delete only)
  await api.functional.aimall_backend.customer.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: childComment.id,
    },
  );

  // 4. Try to fetch the now soft-deleted child reply -- should produce NOT FOUND
  await TestValidator.error(
    "fetching soft-deleted child comment should result in not found",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.comments.at(
      connection,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
      },
    );
  });
}
