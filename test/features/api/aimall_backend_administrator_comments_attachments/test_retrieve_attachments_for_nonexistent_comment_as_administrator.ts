import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate that the administrator API responds correctly when attempting to
 * retrieve attachments for a non-existent comment.
 *
 * This test ensures that when an administrator requests the attachments for a
 * comment ID which does not exist, the endpoint
 * /aimall-backend/administrator/comments/{commentId}/attachments returns a 404
 * Not Found or appropriate error response.
 *
 * Steps:
 *
 * 1. Generate a random UUID (which is almost certainly not present as a comment).
 * 2. As administrator, call the attachments retrieval API for this commentId.
 * 3. Assert that a 404 or not-found error is thrown—no attachments should be
 *    returned.
 *
 * This protects the system's behavior for invalid resource requests and
 * prevents data leaks or ambiguous results.
 */
export async function test_api_aimall_backend_administrator_comments_attachments_index_test_retrieve_attachments_for_nonexistent_comment_as_administrator(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID expected not to exist
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt to fetch attachments; expect 404 or error for non-existent ID
  await TestValidator.error("should 404 for nonexistent commentId")(
    async () => {
      await api.functional.aimall_backend.administrator.comments.attachments.index(
        connection,
        {
          commentId: randomCommentId,
        },
      );
    },
  );
}
