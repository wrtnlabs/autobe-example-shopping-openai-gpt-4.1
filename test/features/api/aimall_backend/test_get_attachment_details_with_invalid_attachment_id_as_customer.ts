import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Test error handling for retrieving a comment attachment with an invalid
 * attachmentId.
 *
 * This test verifies that the API correctly returns a not-found error when a
 * customer attempts to fetch an attachment by its ID for a given comment, but
 * the specified attachmentId does not exist or is invalid (i.e., it does not
 * belong to the comment, or does not exist at all).
 *
 * Test steps:
 *
 * 1. Create a comment as a customer — this ensures we have a valid commentId for
 *    the test, and there is an existing comment to target.
 * 2. Attempt to retrieve an attachment using this valid commentId, but with a
 *    random/non-existent attachmentId (use random UUID that does not belong to
 *    any actual attachment).
 * 3. Expect a not-found (error) response from the API when querying with the
 *    invalid attachmentId.
 * 4. Use TestValidator.error to assert that the not-found error is thrown.
 *
 * This ensures the system does not expose attachment data for invalid or
 * unrelated identifiers and that proper error handling is implemented.
 */
export async function test_api_aimall_backend_test_get_attachment_details_with_invalid_attachment_id_as_customer(
  connection: api.IConnection,
) {
  // 1. Create a comment as the test's parent entity
  const comment: IAimallBackendComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(comment);

  // 2. Attempt to fetch an attachment with a non-existent attachmentId
  // Use a random UUID; it is highly unlikely to match any real attachment
  const invalidAttachmentId = typia.random<string & tags.Format<"uuid">>();

  // 3. Expect the request to throw an error (e.g., not-found)
  await TestValidator.error("not found error on invalid attachmentId")(
    async () => {
      await api.functional.aimall_backend.customer.comments.attachments.at(
        connection,
        {
          commentId: comment.id,
          attachmentId: invalidAttachmentId,
        },
      );
    },
  );
}
