import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test that an administrator can update any comment's content and privacy
 * setting regardless of author.
 *
 * Business scenario:
 *
 * - A regular customer writes a comment (as setup).
 * - An administrator updates the content and privacy flag of that comment
 *   (cross-role privilege).
 * - Audit/update-tracking should be triggered (updated_at must advance).
 * - The API response should return the updated data reflecting the changes.
 *
 * Implementation steps:
 *
 * 1. (Setup) As a customer, create a new comment via the customer comments
 *    endpoint.
 * 2. Record the commentId and its initial updated_at timestamp.
 * 3. As an administrator, call the administrator comments update endpoint using
 *    the commentId and submit new body text and toggle the is_private flag.
 * 4. Assert that the response reflects the updated content and changed privacy
 *    flag, and that updated_at differs (audit/compliance: change tracking).
 */
export async function test_api_aimall_backend_administrator_comments_test_update_comment_by_administrator(
  connection: api.IConnection,
) {
  // 1. As a customer, create a new comment
  const customerComment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: typia.random<string & tags.Format<"uuid">>(),
        body: "Original comment by customer.",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(customerComment);

  // 2. Record original timestamp
  const oldUpdatedAt: string & tags.Format<"date-time"> =
    customerComment.updated_at;
  const originalId: string & tags.Format<"uuid"> = customerComment.id;

  // 3. As administrator, update the comment content and privacy flag
  const newBody = "Edited by admin.";
  const newPrivacy = true;
  const adminUpdated: IAimallBackendComment =
    await api.functional.aimall_backend.administrator.comments.update(
      connection,
      {
        commentId: originalId,
        body: {
          body: newBody,
          is_private: newPrivacy,
        } satisfies IAimallBackendComment.IUpdate,
      },
    );
  typia.assert(adminUpdated);

  // 4. Validate that updates have taken effect and audit tracking is updated
  TestValidator.equals("comment id unchanged")(adminUpdated.id)(originalId);
  TestValidator.notEquals("updated_at should change")(adminUpdated.updated_at)(
    oldUpdatedAt,
  );
  TestValidator.equals("updated body")(adminUpdated.body)(newBody);
  TestValidator.equals("privacy flag edited")(adminUpdated.is_private)(
    newPrivacy,
  );
}
