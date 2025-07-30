import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate authentication and authorization enforcement for the seller comments
 * list API.
 *
 * Ensures that attempting to retrieve comments for a post through the
 * seller-facing endpoint `/aimall-backend/seller/posts/{postId}/comments`
 * without proper authentication or authorization results in an error,
 * confirming enforcement of access control policies.
 *
 * Steps:
 *
 * 1. Create a seller post to serve as the target resource.
 * 2. Remove authentication from the connection to simulate an unauthenticated
 *    request.
 * 3. Attempt to fetch comments for the created post without authentication and
 *    ensure it fails.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_list_comments_for_post_without_authorization(
  connection: api.IConnection,
) {
  // 1. Create a seller post (ensure the resource exists for comment lookup)
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()(1)(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Remove authentication to simulate an unauthenticated call
  const unauthConnection = {
    ...connection,
    headers: { ...connection.headers },
  };
  delete unauthConnection.headers.Authorization;

  // 3. Expect error when fetching comments without authentication
  await TestValidator.error("unauthenticated comments listing should fail")(
    () =>
      api.functional.aimall_backend.seller.posts.comments.index(
        unauthConnection,
        {
          postId: post.id,
        },
      ),
  );
}
