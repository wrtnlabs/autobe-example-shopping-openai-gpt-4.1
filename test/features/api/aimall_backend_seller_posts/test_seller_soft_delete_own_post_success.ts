import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test that a seller can successfully soft delete their own post.
 *
 * This test flow creates a post as a seller, verifies its presence, then soft
 * deletes it (sets deleted_at).
 *
 * Steps:
 *
 * 1. Create a community post as a test seller
 *    (api.functional.aimall_backend.seller.posts.create)
 * 2. Soft delete it with api.functional.aimall_backend.seller.posts.erase
 *
 * Only steps for which SDK methods and DTOs are provided are implemented.
 */
export async function test_api_aimall_backend_seller_posts_test_seller_soft_delete_own_post_success(
  connection: api.IConnection,
) {
  // 1. Create a post as the seller
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()(1)(1),
    is_private: false,
  };
  const createdPost: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: postInput,
    });
  typia.assert(createdPost);
  TestValidator.equals("created post title")(createdPost.title)(
    postInput.title,
  );
  TestValidator.equals("created post body")(createdPost.body)(postInput.body);
  TestValidator.equals("not deleted yet")(createdPost.deleted_at)(null);

  // 2. Soft delete the post
  await api.functional.aimall_backend.seller.posts.erase(connection, {
    postId: createdPost.id,
  });
  // If further verification was possible (e.g. via post-list or audit/query), would do so here.
}
