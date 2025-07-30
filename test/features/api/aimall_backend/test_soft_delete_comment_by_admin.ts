import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate soft deletion of a comment by an administrator user regardless of
 * original author.
 *
 * Business context:
 *
 * - Only logical (soft) deletes are allowed; actual record remains for audit, but
 *   `deleted_at` marks it as deleted.
 * - Admins can moderate/delete any user comment, not just their own, for
 *   compliance.
 * - Deleted comments must be excluded from standard (customer-facing) queries,
 *   but remain in database for compliance.
 *
 * Steps:
 *
 * 1. (SETUP) As a customer, create a comment (using customer comment API)
 * 2. As an administrator, soft-delete the comment using the admin endpoint
 *    (administrator/comments/{commentId})
 * 3. (Cannot be implemented with available API): Would re-fetch the comment to
 *    ensure `deleted_at` is set
 * 4. (Cannot be implemented): Would check comment is excluded from standard
 *    queries
 *
 * Only steps feasible with provided API/DTO are implemented. Authentication for
 * customer/admin is supposed to be handled by the test harness or connection
 * object.
 */
export async function test_api_aimall_backend_test_soft_delete_comment_by_admin(
  connection: api.IConnection,
) {
  // 1. Customer creates a comment
  const commentInput: IAimallBackendComment.ICreate = {
    body: "This comment is for admin soft-delete test.",
    is_private: false,
  };
  const createdComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: commentInput,
    });
  typia.assert(createdComment);

  // 2. Admin soft deletes the comment
  await api.functional.aimall_backend.administrator.comments.erase(connection, {
    commentId: createdComment.id,
  });

  // 3. Verification of `deleted_at` and exclusion from queries is not possible with available SDK functions
}
