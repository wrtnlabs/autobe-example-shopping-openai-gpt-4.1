import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that the original author of a reply (child comment) can update
 * permitted fields successfully.
 *
 * This scenario tests the ability of an authenticated customer to edit their
 * own reply (child comment) in a comment thread. The user creates a parent
 * comment, then replies to it (as the author, using the same connection), then
 * edits fields of the reply using the update endpoint. After updating, the test
 * verifies that the body and privacy flag are updated and that the updated_at
 * timestamp has changed, confirming the modification.
 *
 * Steps:
 *
 * 1. Create a parent comment (root of thread)
 * 2. Create a child comment (reply) under the parent comment using the same user
 * 3. Edit the reply (child comment) with new body text and privacy setting
 * 4. Assert that the updated reply reflects new values for body/is_private, and
 *    that updated_at has changed from its original value
 */
export async function test_api_aimall_backend_customer_comments_comments_test_edit_reply_comment_successful_as_author(
  connection: api.IConnection,
) {
  // 1. Create parent comment (root thread)
  const parentCreate: IAimallBackendComment.ICreate = {
    body: "Initial parent comment",
    is_private: false,
  };
  const parent: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: parentCreate,
    });
  typia.assert(parent);

  // 2. Create the child comment (reply) under the parent
  const childCreate: IAimallBackendComment.ICreate = {
    parent_id: parent.id,
    body: "Original reply",
    is_private: false,
  };
  const child: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: childCreate,
      },
    );
  typia.assert(child);

  // 3. Update the reply with new values
  const updateDto: IAimallBackendComment.IUpdate = {
    body: "Edited reply with new content",
    is_private: true,
  };
  const updated: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.comments.update(
      connection,
      {
        commentId: parent.id,
        childCommentId: child.id,
        body: updateDto,
      },
    );
  typia.assert(updated);

  // 4. Assert that body/is_private are updated as expected, and updated_at is modified vs original child
  TestValidator.equals("updated body")(updated.body)(
    "Edited reply with new content",
  );
  TestValidator.equals("updated is_private")(updated.is_private)(true);
  TestValidator.notEquals("updated_at modified")(updated.updated_at)(
    child.updated_at,
  );
}
