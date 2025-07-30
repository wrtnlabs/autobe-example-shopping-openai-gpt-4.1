import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that an administrator can edit the mutable fields of a reply (child
 * comment) under any parent comment, regardless of authorship.
 *
 * This simulates a moderation/redaction workflow: a customer posts a parent
 * comment, then creates a reply under it; then, an admin edits that child
 * comment's field (`body`, `is_private`) to redact or correct content. The goal
 * is to confirm that the admin override works on comments made by other users.
 *
 * Test Workflow:
 *
 * 1. Create a parent comment as customer
 * 2. Create a child (reply) comment as customer under the parent
 * 3. [If admin privilege escalation required: switch connection to admin. If
 *    connection is admin already, continue.]
 * 4. Call administrator's update endpoint for the child comment, providing new
 *    values for `body` and `is_private`.
 * 5. Verify the response: the returned comment should reflect changes to `body`
 *    and `is_private`, and `updated_at` must increase from its old value.
 * 6. Confirm parent-child relations are unchanged, and other immutable fields
 *    remain the same.
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_updates_child_comment_fields(
  connection: api.IConnection,
) {
  // Step 1: Customer creates a parent comment
  const parent: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parent);

  // Step 2: Customer creates a reply comment under parent
  const reply: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: RandomGenerator.paragraph()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(reply);

  // Step 3: [If admin privilege escalation required: switch connection to admin. If connection is admin already, continue.]

  // Step 4: Admin updates the child comment with new body and toggled is_private
  const updatedBody = RandomGenerator.paragraph()();
  const updatedIsPrivate = !reply.is_private;
  const updated: IAimallBackendComment =
    await api.functional.aimall_backend.administrator.comments.comments.update(
      connection,
      {
        commentId: parent.id,
        childCommentId: reply.id,
        body: {
          body: updatedBody,
          is_private: updatedIsPrivate,
        } satisfies IAimallBackendComment.IUpdate,
      },
    );
  typia.assert(updated);

  // Step 5: Check that changes were applied, updated_at is newer, non-mutable fields are unchanged
  TestValidator.equals("id unchanged")(updated.id)(reply.id);
  TestValidator.equals("parent_id unchanged")(updated.parent_id)(
    reply.parent_id,
  );
  TestValidator.equals("body updated")(updated.body)(updatedBody);
  TestValidator.equals("is_private updated")(updated.is_private)(
    updatedIsPrivate,
  );
  TestValidator.predicate("updated_at advanced")(
    new Date(updated.updated_at) > new Date(reply.updated_at),
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    reply.created_at,
  );
  TestValidator.equals("post_id unchanged")(updated.post_id)(reply.post_id);
  TestValidator.equals("review_id unchanged")(updated.review_id)(
    reply.review_id,
  );
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    reply.customer_id,
  );
  TestValidator.equals("deleted_at unchanged")(updated.deleted_at)(
    reply.deleted_at,
  );
}
