import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test the administrator's soft-delete of a child comment (reply) in a thread.
 *
 * Simulates the moderation process where a customer creates a parent comment
 * and a reply, and then an administrator soft-deletes the reply using the
 * administration API. The test ensures creation and delete flows operate as
 * intended. Fully validates type safety and correct workflow. Further
 * validation (deleted_at field, visibility, audit logging) is not implementable
 * with currently available endpoints and is noted as such.
 *
 * Steps:
 *
 * 1. Customer creates the parent/root comment
 * 2. Customer replies to the comment (child comment)
 * 3. Administrator soft-deletes the child comment via DELETE endpoint
 * 4. (Not implementable) Validate soft-delete in comment views/listings or audit
 *    trail
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_soft_delete_reply_success(
  connection: api.IConnection,
) {
  // 1. Customer creates the parent/root comment
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        review_id: null,
        parent_id: null,
        body: "Parent comment for moderation test",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Customer creates the reply (child comment)
  const childComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: parentComment.post_id ?? null,
          review_id: null,
          parent_id: parentComment.id,
          body: "This is a child comment for soft delete.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(childComment);

  // 3. Administrator soft-deletes the child comment
  await api.functional.aimall_backend.administrator.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: childComment.id,
    },
  );

  // 4. Further validation (deleted_at, visibility, audit log) not possible without additional endpoints.
}
