import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that a customer can retrieve all attachments for a comment they own.
 *
 * This test ensures that, after creating a comment and uploading several
 * attachments to it as an authenticated customer, the customer can retrieve all
 * those attachments using the attachments index endpoint. It also verifies that
 * only attachments for the specific comment are returned (no leakage from other
 * comments), and checks the pagination information if applicable.
 *
 * Step-by-step process:
 *
 * 1. Create a customer comment as an authenticated customer
 * 2. Attach multiple files to this comment via the attachments API
 * 3. Retrieve attachments using the attachments index endpoint
 * 4. Verify all created attachments for the comment are present
 * 5. Confirm that only attachments belonging to this commentId appear in the
 *    listing
 * 6. If pagination exists, confirm the meta info (current, limit, records)
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_list_comment_attachments_by_author(
  connection: api.IConnection,
) {
  // 1. Create a customer comment
  const commentInput: IAimallBackendComment.ICreate = {
    post_id: null,
    review_id: null,
    parent_id: null,
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: commentInput },
  );
  typia.assert(comment);

  // 2. Attach multiple files to this comment
  const fileInputs = ArrayUtil.repeat(3)(
    () =>
      ({
        post_id: null,
        comment_id: comment.id,
        review_id: null,
        file_uri: RandomGenerator.alphaNumeric(30),
        file_type: "image/jpeg",
        file_size: typia.random<number & tags.Type<"int32">>(),
      }) satisfies IAimallBackendAttachment.ICreate,
  );
  const createdAttachments: IAimallBackendAttachment[] = [];
  for (const body of fileInputs) {
    const attachment =
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        { commentId: comment.id, body },
      );
    typia.assert(attachment);
    createdAttachments.push(attachment);
  }

  // 3. Retrieve attachments via index endpoint
  const page =
    await api.functional.aimall_backend.customer.comments.attachments.index(
      connection,
      { commentId: comment.id },
    );
  typia.assert(page);

  // 4. Confirm all uploaded attachments appear and only attachments for that comment are listed
  for (const attachment of createdAttachments) {
    const found = page.data.find((a) => a.id === attachment.id);
    TestValidator.predicate("Attachment for the comment is listed")(!!found);
    TestValidator.equals("Belonged to correct comment")(attachment.comment_id)(
      comment.id,
    );
  }
  for (const row of page.data) {
    TestValidator.equals("All attachments in listing belong to the comment")(
      row.comment_id,
    )(comment.id);
  }

  // 5. If pagination is used, check meta info
  TestValidator.equals("Page current is 1")(page.pagination.current)(1);
  TestValidator.equals("Page limit matches count")(page.pagination.limit)(
    page.data.length,
  );
  TestValidator.equals("Records count")(page.pagination.records)(
    page.data.length,
  );
}
