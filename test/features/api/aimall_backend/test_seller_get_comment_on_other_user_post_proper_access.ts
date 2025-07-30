import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validates seller access permissions to comments on other users' posts.
 *
 * This test performs an end-to-end scenario where a seller attempts to access
 * comments on a post authored by another (customer) user. It verifies the
 * following business rules:
 *
 * 1. Seller can view public comments on posts they do not own.
 * 2. Seller is denied access (should receive error) to private comments on posts
 *    they do not own and did not author.
 *
 * Steps:
 *
 * 1. Create a post as a customer user (not seller).
 * 2. Add two comments to the post (one public, one private) as the customer.
 * 3. Switch to the seller session.
 * 4. Attempt to fetch both comments via the seller's endpoint:
 *
 *    - Fetching the public comment should succeed and match the original data.
 *    - Fetching the private comment should fail with an access error.
 */
export async function test_api_aimall_backend_test_seller_get_comment_on_other_user_post_proper_access(
  connection: api.IConnection,
) {
  // 1. Create a post as a customer
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2a. Add a public comment to the post
  const publicComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(2),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicComment);

  // 2b. Add a private comment to the post
  const privateComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          body: RandomGenerator.paragraph()(2),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateComment);

  // 3. Switch to seller session
  //    (Assuming token/session context switch is managed outside this test. If not, would login here.)

  // 4a. Seller attempts to fetch the public comment (should succeed)
  const sellerPublic =
    await api.functional.aimall_backend.seller.posts.comments.at(connection, {
      postId: post.id,
      commentId: publicComment.id,
    });
  typia.assert(sellerPublic);
  TestValidator.equals("Seller fetches public comment")(sellerPublic.body)(
    publicComment.body,
  );
  TestValidator.equals("Seller fetches public comment - privacy")(
    sellerPublic.is_private,
  )(false);
  TestValidator.equals("Seller fetches public comment - post ID")(
    sellerPublic.post_id,
  )(post.id);

  // 4b. Seller attempts to fetch the private comment (should fail with error)
  await TestValidator.error("Seller should not access private comment")(
    async () => {
      await api.functional.aimall_backend.seller.posts.comments.at(connection, {
        postId: post.id,
        commentId: privateComment.id,
      });
    },
  );
}
