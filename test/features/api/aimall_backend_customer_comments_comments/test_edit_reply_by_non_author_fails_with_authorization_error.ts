import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that only the author of a reply (child comment) can update it,
 * ensuring strict author ownership enforcement.
 *
 * Business context:
 *
 * - Replies to comments (child comments) must only be editable by their original
 *   author; other users should be forbidden from editing.
 * - This test verifies that an attempt by a non-author is properly rejected by
 *   the system.
 *
 * Steps:
 *
 * 1. Create a parent comment as user A (using an isolated connection scoped as
 *    user A).
 * 2. Create a reply (child comment) on the parent comment as user A (scoped
 *    connection A).
 * 3. Switch to a different user (user B; isolated connection B context).
 * 4. Attempt to update the child comment as user B -- this should result in an
 *    authorization error/forbidden.
 *
 * Edge cases:
 *
 * - Both users are isolated (no shared session).
 * - Update request is syntactically valid; only author ownership is tested.
 * - Only provided APIs/DTOs are used; any missing authentication/login is assumed
 *   provided via connection context.
 */
export async function test_api_aimall_backend_customer_comments_comments_test_edit_reply_by_non_author_fails_with_authorization_error(
  connectionA: api.IConnection,
  connectionB: api.IConnection,
) {
  // 1. Create parent comment as User A
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connectionA, {
      body: {
        body: "Parent comment from User A", // Required: main text
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create reply (child comment) as User A
  const childComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connectionA,
      {
        commentId: parentComment.id,
        body: {
          parent_id: parentComment.id,
          body: "Child reply by User A", // Required: main text
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 3. Attempt to update the reply as User B (should fail due to non-ownership)
  await TestValidator.error("Non-author cannot update the child comment")(() =>
    api.functional.aimall_backend.customer.comments.comments.update(
      connectionB,
      {
        commentId: parentComment.id,
        childCommentId: childComment.id,
        body: {
          body: "Malicious edit from non-author",
          is_private: true,
        } satisfies IAimallBackendComment.IUpdate,
      },
    ),
  );
}
