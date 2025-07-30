import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate endpoint rejection when retrieving post comments as an unauthorized
 * user.
 *
 * This test confirms that the GET
 * /aimall-backend/customer/posts/{postId}/comments endpoint enforces
 * authentication and does not allow anonymous or invalid users to list post
 * comments.
 *
 * Test Workflow:
 *
 * 1. Prepare a random UUID to use as postId (any value is acceptable, as
 *    authorization fails first).
 * 2. Use a connection object with no authentication headers, simulating an
 *    anonymous/unauthorized user.
 * 3. Attempt to call the API to retrieve comments for the given post.
 * 4. Use TestValidator.error to assert that an authentication or permission error
 *    is thrown (401/403).
 */
export async function test_api_aimall_backend_customer_posts_comments_test_get_all_comments_for_post_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Prepare a random UUID as postId (since actual post access is not reached)
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2-4. Execute and confirm error on unauthenticated access
  await TestValidator.error("Anonymous users cannot retrieve comments")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.index(
        connection,
        { postId },
      );
    },
  );
}
