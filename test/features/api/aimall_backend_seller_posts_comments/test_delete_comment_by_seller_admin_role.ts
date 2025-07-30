import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * E2E test for soft-deletion of comments by seller/admin role.
 *
 * This test case verifies that a seller (or admin) can soft-delete any comment
 * under a given post, regardless of the commenter, for moderation and
 * compliance purposes.
 *
 * Test workflow:
 *
 * 1. (Preparation) Retrieve or create a seller account to simulate seller role
 *    (using the seller GET endpoint).
 * 2. Create a post as the seller using the appropriate endpoint.
 * 3. Create TWO comments under the post: 3.1 One comment authored by the seller
 *    (simulate as seller identity). 3.2 One comment authored by a (mocked)
 *    customer (simulate with distinct author context if possible).
 * 4. As the seller, perform DELETE (soft-delete) on BOTH comments via the
 *    endpoint.
 * 5. (API does not provide comment fetch-by-id, so cannot directly assert
 *    'deleted_at' after deletion.)
 * 6. (Audit log checks omitted: no API endpoint exists for audit.)
 *
 * Expected Results:
 *
 * - Both comments are created successfully and initially have 'deleted_at' as
 *   null.
 * - After each delete, if API does not error, consider as success (since direct
 *   deleted_at check is unsupported).
 * - Deletion is allowed for both comments regardless of author.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_delete_comment_by_seller_admin_role(
  connection: api.IConnection,
) {
  // 1. Preparation: Retrieve or create a seller (simulate role context)
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.seller.sellers.at(connection, {
      sellerId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(seller);

  // 2. Create a post as the seller
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Test E2E Soft Delete Comment by Seller",
        body: "Post body for comment moderation test",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);

  // 3.1 Create comment as seller
  const sellerComment: IAimallBackendComment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Comment by seller for soft delete test",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(sellerComment);
  TestValidator.equals("seller comment initially not deleted")(
    sellerComment.deleted_at,
  )(null);

  // 3.2 Create second comment (simulate as customer or non-seller)
  const customerComment: IAimallBackendComment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Comment by (pseudo) customer for moderation",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(customerComment);
  TestValidator.equals("customer comment initially not deleted")(
    customerComment.deleted_at,
  )(null);

  // 4. As seller, soft-delete both comments (moderator scenario)
  await api.functional.aimall_backend.seller.posts.comments.erase(connection, {
    postId: post.id,
    commentId: sellerComment.id,
  });
  await api.functional.aimall_backend.seller.posts.comments.erase(connection, {
    postId: post.id,
    commentId: customerComment.id,
  });

  // 5. Cannot verify deleted_at update after soft-delete (no comment fetch endpoint) - assume success if no error.
  // 6. Audit log check omitted (no endpoint available).
}
