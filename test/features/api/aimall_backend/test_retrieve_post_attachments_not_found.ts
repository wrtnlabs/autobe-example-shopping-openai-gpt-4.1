import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validate error handling when retrieving post attachments for a non-existent
 * or unauthorized post.
 *
 * This test attempts to fetch the attachments list for a community post (by
 * postId) that does not exist, or one the customer is not permitted to access.
 * The API is expected to return a 404 Not Found error (or an equivalent access
 * denied error) and must not return any legitimate attachment data for the
 * request. This ensures proper enforcement of data visibility, security, and
 * error reporting for posts outside the customer's access scope.
 *
 * Steps:
 *
 * 1. Generate a random UUID for postId that does not exist in the database.
 * 2. Attempt to call the attachments list API with this fake postId as the
 *    customer.
 * 3. Validate that the API throws an error (ideally 404/403), and that no
 *    attachment data is returned.
 */
export async function test_api_aimall_backend_test_retrieve_post_attachments_not_found(
  connection: api.IConnection,
) {
  // Step 1: Generate a non-existent postId
  const fakePostId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt retrieval and validate error is thrown - must not leak attachment data
  await TestValidator.error(
    "non-existent postId should throw 404 or access error",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.attachments.index(
      connection,
      {
        postId: fakePostId,
      },
    );
  });
}
