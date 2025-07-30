import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test that a comment owner can retrieve the metadata for a specific attachment
 * using valid commentId and attachmentId.
 *
 * This E2E test simulates the following workflow for a customer:
 *
 * 1. Create a new comment as the authenticated customer.
 * 2. Upload an attachment file to that comment and retrieve its id.
 * 3. Fetch the attachment using GET by commentId and attachmentId.
 * 4. Validate that metadata (file_uri, file_type, file_size, created_at, and
 *    linkage fields like comment_id) are present and have correct
 *    relationships.
 *
 * This test ensures that ownership controls grant the comment owner access to
 * their own attachments, and the API correctly returns all relevant metadata
 * when queried by ID.
 */
export async function test_api_aimall_backend_customer_comments_attachments_get_attachment_details_by_comment_owner_with_valid_attachment_id(
  connection: api.IConnection,
) {
  // 1. Create a new comment as the authenticated customer
  const createCommentBody: IAimallBackendComment.ICreate = {
    post_id: null,
    review_id: null,
    parent_id: null,
    body: RandomGenerator.paragraph()(),
    is_private: false,
  };
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: createCommentBody,
    },
  );
  typia.assert(comment);

  // 2. Upload an attachment to the comment
  const attachmentBody: IAimallBackendAttachment.ICreate = {
    post_id: null,
    comment_id: comment.id,
    review_id: null,
    file_uri: `s3://bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    file_type: "image/jpeg",
    file_size: 1024,
  };
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // 3. Fetch the attachment via GET with commentId and attachmentId
  const fetched =
    await api.functional.aimall_backend.customer.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  typia.assert(fetched);

  // 4. Validate that returned metadata and relationships are correct
  TestValidator.equals("attachment id must match")(fetched.id)(attachment.id);
  TestValidator.equals("attachment comment linkage")(fetched.comment_id)(
    comment.id,
  );
  TestValidator.equals("file_uri must match")(fetched.file_uri)(
    attachment.file_uri,
  );
  TestValidator.equals("file_type must match")(fetched.file_type)(
    attachment.file_type,
  );
  TestValidator.equals("file_size must match")(fetched.file_size)(
    attachment.file_size,
  );
}
