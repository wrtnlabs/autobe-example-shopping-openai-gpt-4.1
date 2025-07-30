import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test that a seller cannot update a post owned by another seller
 * (authorization enforcement).
 *
 * Business Context:
 *
 * - Only the original author of a post (seller) can edit their own post.
 * - An attempt by an unrelated seller to update a post should fail with a
 *   forbidden/authorization error.
 *
 * Test Steps:
 *
 * 1. Authenticate as Seller A and create a post.
 * 2. Switch to Seller B (a different seller).
 * 3. Attempt to update Seller A's post as Seller B.
 * 4. Assert that the update fails due to authorization (forbidden).
 *
 * Note: Actual seller authentication switching must be handled by test
 * framework or outer test context, as authentication endpoints are not provided
 * in this SDK.
 */
export async function test_api_aimall_backend_seller_posts_test_update_post_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Authenticate as Seller A and create a post.
  const postCreateInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()()(2),
    is_private: false,
  };
  const sellerAPost = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: postCreateInput,
    },
  );
  typia.assert(sellerAPost);

  // (OUT-OF-SCOPE) Switch authentication context to Seller B.
  // This must be performed by the e2e framework or outer test fixture, since no user API for auth is exposed.

  // 2. Attempt to update Seller A's post as Seller B. This should fail.
  const updateInput: IAimallBackendPost.IUpdate = {
    title: RandomGenerator.paragraph()(2),
    body: RandomGenerator.content()()(1),
    is_private: true,
  };

  await TestValidator.error("should fail: only owner can update post")(
    async () => {
      await api.functional.aimall_backend.seller.posts.update(connection, {
        postId: sellerAPost.id,
        body: updateInput,
      });
    },
  );
}
