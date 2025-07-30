import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate error response when fetching details for a nonexistent attachment
 * (admin view).
 *
 * This test ensures that if an administrator attempts to retrieve attachment
 * details for an attachmentId that does not exist for a real comment, the
 * system appropriately responds with an error (such as HTTP 404), confirming
 * robust error handling.
 *
 * Steps:
 *
 * 1. Create a valid comment as test setup (using customer endpoint).
 * 2. Attempt to fetch an attachment by a random (nonexistent) attachmentId for
 *    that comment as an administrator.
 * 3. Assert that an error is thrown (404 or logic error).
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_admin_get_attachment_details_for_nonexistent_attachment(
  connection: api.IConnection,
) {
  // 1. Create a valid comment (dependency setup)
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Attempt as admin to fetch attachment info for a random (nonexistent) attachmentId
  const randomAttachmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("error thrown for missing attachment")(async () => {
    await api.functional.aimall_backend.administrator.comments.attachments.at(
      connection,
      {
        commentId: comment.id,
        attachmentId: randomAttachmentId,
      },
    );
  });
}
