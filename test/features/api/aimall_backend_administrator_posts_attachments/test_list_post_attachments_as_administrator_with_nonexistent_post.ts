import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate correct error handling when fetching attachments for a non-existent
 * post as an administrator.
 *
 * Ensures the API returns a 404 Not Found or appropriate error when attempting
 * to retrieve attachments for a postId that does not exist in the system.
 * Robust handling of resource-missing scenarios by the API is critical for
 * administrative reliability.
 *
 * Steps:
 *
 * 1. Generate a random UUID that is almost certain not to correspond to any
 *    existing post.
 * 2. Attempt to fetch attachments via GET
 *    /aimall-backend/administrator/posts/{postId}/attachments using this UUID.
 * 3. Verify that the API responds with an error, such as 404 Not Found, indicating
 *    proper error handling for missing resources.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_list_post_attachments_as_administrator_with_nonexistent_post(
  connection: api.IConnection,
) {
  // 1. Generate a random, unlikely-to-exist UUID as the postId
  const nonExistentPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to fetch attachments for this non-existent post and expect an error
  await TestValidator.error("should return error for non-existent postId")(
    async () => {
      await api.functional.aimall_backend.administrator.posts.attachments.index(
        connection,
        {
          postId: nonExistentPostId,
        },
      );
    },
  );
}
