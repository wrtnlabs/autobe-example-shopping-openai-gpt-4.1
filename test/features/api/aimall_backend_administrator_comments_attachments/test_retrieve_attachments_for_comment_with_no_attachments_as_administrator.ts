import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate administrator can retrieve attachments from a comment with no
 * attachments.
 *
 * Business context: Administrators may need to inspect comment-related media
 * for moderation or auditing. In this test, we verify the system's empty state
 * handling: when a valid comment has no associated attachments, the
 * administrator should receive an empty list/page—not an error.
 *
 * Steps:
 *
 * 1. As a customer, create a new comment with no attachments attached.
 * 2. As administrator, call the attachment list endpoint for that comment.
 * 3. Assert that the result structure is correct and the 'data' array is empty.
 * 4. Assert that no errors occur in this empty-state query.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_index_for_comment_with_no_attachments(
  connection: api.IConnection,
) {
  // 1. Create a comment as a customer (no attachments)
  const commentInput = {
    body: RandomGenerator.paragraph()(),
    is_private: typia.random<boolean>(),
    post_id: null,
    review_id: null,
    parent_id: null,
  } satisfies IAimallBackendComment.ICreate;

  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 2. Administrator retrieves attachments for comment
  const attachmentsPage =
    await api.functional.aimall_backend.administrator.comments.attachments.index(
      connection,
      {
        commentId: comment.id,
      },
    );
  typia.assert(attachmentsPage);

  // 3. Assert that attachments list is empty
  TestValidator.equals("attachments array is empty")(
    attachmentsPage.data.length,
  )(0);

  // 4. Ensure pagination object is intact and reflects empty state
  TestValidator.equals("pagination current page")(
    attachmentsPage.pagination.current,
  )(1);
  TestValidator.equals("pagination records")(
    attachmentsPage.pagination.records,
  )(0);
  TestValidator.equals("pagination pages")(attachmentsPage.pagination.pages)(0);
}
