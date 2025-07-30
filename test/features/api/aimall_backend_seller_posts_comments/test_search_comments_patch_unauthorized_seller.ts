import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling for unauthorized seller access to PATCH
 * /aimall-backend/seller/posts/{postId}/comments.
 *
 * This test ensures that if a user who lacks proper seller permissions attempts
 * to perform a PATCH search for comments on a seller's post, the API returns an
 * appropriate authorization error and does not disclose any comment data.
 *
 * Test Steps:
 *
 * 1. Generate a random post UUID (not necessarily tied to an actual post since
 *    permission is checked before search).
 * 2. Craft a random search/filter body for the comment query using
 *    IAimallBackendComment.IRequest.
 * 3. Attempt to search for comments as an unauthorized (unauthenticated) user
 *    using the PATCH endpoint.
 * 4. Assert that an authorization error is thrown and that no comment data is
 *    returned in the success path.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_search_comments_patch_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. Generate random post ID.
  const postId = typia.random<string & tags.Format<"uuid">>();

  // 2. Prepare a random search/filter body for the PATCH request.
  const body = typia.random<IAimallBackendComment.IRequest>();

  // 3. Simulate an unauthenticated/unauthorized connection by removing the Authorization header (if present).
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: Object.fromEntries(
      Object.entries(connection.headers ?? {}).filter(
        ([k]) => k.toLowerCase() !== "authorization",
      ),
    ),
  };

  // 4. Attempt PATCH search as unauthorized seller, expect an error (authorization error).
  await TestValidator.error("unauthorized seller search should fail")(
    async () => {
      await api.functional.aimall_backend.seller.posts.comments.search(
        unauthConnection,
        {
          postId,
          body,
        },
      );
    },
  );
}
