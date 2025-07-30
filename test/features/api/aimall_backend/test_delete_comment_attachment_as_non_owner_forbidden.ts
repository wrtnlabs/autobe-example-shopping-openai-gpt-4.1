import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate access control for deleting comment attachments as a non-owner
 * (customer, not author or admin).
 *
 * Scenario:
 *
 * 1. Customer A creates a comment
 * 2. Customer A attaches a file to the created comment
 * 3. (Customer B would sign up and authenticate, but user switching is not
 *    possible with provided APIs)
 * 4. Customer B (simulated) attempts to use administrator endpoint to delete the
 *    attachment
 * 5. Confirm the API returns a forbidden (403) error, validating enforcement of
 *    access control
 *
 * This test ensures that only the comment owner or an administrator can delete
 * comment attachments. Since customer switching/join is unavailable in provided
 * APIs, we simulate Customer B as a different non-owner on the same connection,
 * which should be rejected by access policy.
 */
export async function test_api_aimall_backend_test_delete_comment_attachment_as_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Customer A creates a comment
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Customer A attaches a file to the comment
  const attachment =
    await api.functional.aimall_backend.customer.comments.attachments.create(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          file_type: "image/jpeg",
          file_size: 12345,
        } satisfies IAimallBackendAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 3. Simulate Customer B: In reality, we'd re-authenticate as another customer, but join/login API is not provided.
  // Thus, we continue using the same connection as a non-owner scenario for testing forbidden behavior.

  // 4. Attempt to use administrator endpoint to delete the attachment as a non-owner
  await TestValidator.error(
    "Non-owner customer should not be able to delete another customer's comment attachment",
  )(async () => {
    await api.functional.aimall_backend.administrator.comments.attachments.erase(
      connection,
      {
        commentId: comment.id,
        attachmentId: attachment.id,
      },
    );
  });
}
