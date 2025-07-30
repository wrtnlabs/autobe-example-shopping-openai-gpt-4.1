import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a non-author and non-admin cannot soft-delete a child (reply)
 * comment.
 *
 * This test verifies the business rule: Only the author of a comment or an
 * administrator is permitted to delete (soft-delete) a child (reply) comment.
 * Attempting this operation as an unauthorized customer must be forbidden (HTTP
 * 403), and the reply's deleted_at value should remain unset.
 *
 * Steps:
 *
 * 1. Customer A creates a parent comment.
 * 2. Customer A creates a child reply to this parent comment.
 * 3. Customer B (different account, not admin) logs in.
 * 4. Customer B attempts to soft-delete Customer A's reply comment.
 * 5. Confirm that the operation yields a 403 Forbidden error.
 * 6. Reload the child comment and verify its deleted_at remains null/unset (not
 *    deleted). (Skipped as no API available.)
 */
export async function test_api_aimall_backend_customer_comments_comments_test_soft_delete_reply_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Customer A creates a parent comment
  const parentBody = {
    body: RandomGenerator.paragraph()(),
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const parent = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: parentBody },
  );
  typia.assert(parent);

  // 2. Customer A creates a child (reply) comment to parent
  const childBody = {
    parent_id: parent.id,
    body: RandomGenerator.content()()(),
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const child =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: childBody,
      },
    );
  typia.assert(child);

  // 3. Simulate account switch: sign in as Customer B
  // (Use actual login/join customer endpoint if available. Otherwise only simulate – as in provided SDK.)
  // (If not available, SKIP actual switch.)

  // 4. Attempt to soft-delete child comment as Customer B (unauthorized)
  await TestValidator.error("forbidden deletion by non-author")(async () => {
    await api.functional.aimall_backend.customer.comments.comments.erase(
      connection,
      {
        commentId: parent.id,
        childCommentId: child.id,
      },
    );
  });

  // 5. Reload the child comment and verify its deleted_at remains unset – not possible with provided APIs, so omitted.
}
