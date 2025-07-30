import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate seller's ability to retrieve all comments for a specific post,
 * including comment privacy rules and pagination.
 *
 * This test confirms:
 *
 * - A seller can create a post and add multiple comments (both public and
 *   private)
 * - When requesting the comment list for their own post, the seller sees all
 *   public comments and their own private ones
 * - Private comments posted by this seller are included in the result, and marked
 *   as private
 * - Pagination metadata is present and structurally valid
 *
 * Limitations: This test covers only the single-seller scenario. Cross-role
 * testing (with a different seller/customer commenting) is noted for further
 * extension but is not implemented due to the absence of explicit customer/user
 * APIs in the provided SDK/contracts.
 *
 * Steps:
 *
 * 1. As an authenticated seller, create a post
 * 2. Post both public and private comments as this seller
 * 3. Retrieve the post's comment list as the same seller
 * 4. Validate:
 *
 *    - Pagination exists and basic count is correct
 *    - Both public/private comments by this seller are present
 *    - Private comment is marked as private
 */
export async function test_api_aimall_backend_seller_posts_comments_test_list_comments_for_post_with_valid_postid_and_authorization(
  connection: api.IConnection,
) {
  // 1. Create a post as authenticated seller
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(2),
    body: RandomGenerator.content()(2)(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Add public comment as this seller
  const publicComment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Public comment by seller",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicComment);

  // 2. Add private comment as this seller
  const privateComment =
    await api.functional.aimall_backend.seller.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Private comment by seller",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateComment);

  // 3. Retrieve comments for the post as seller
  const res = await api.functional.aimall_backend.seller.posts.comments.index(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(res);

  // 4. Check pagination presence and structure
  TestValidator.predicate("Pagination metadata is present")(!!res.pagination);
  TestValidator.predicate("Pagination current page >= 1")(
    res.pagination.current >= 1,
  );
  TestValidator.predicate("Pagination limit >= 1")(res.pagination.limit >= 1);
  TestValidator.predicate("Total records >= 2")(res.pagination.records >= 2);
  TestValidator.predicate("Total pages >= 1")(res.pagination.pages >= 1);

  // 5. Validate that both public and private comments are present
  const pub = res.data.find((c) => c.id === publicComment.id);
  TestValidator.equals("Public comment must be listed")(!!pub)(true);
  TestValidator.equals("Public comment privacy flag")(pub?.is_private)(false);

  const priv = res.data.find((c) => c.id === privateComment.id);
  TestValidator.equals("Private comment must be listed")(!!priv)(true);
  TestValidator.equals("Private comment privacy flag")(priv?.is_private)(true);

  // 6. Comments must point to correct post
  TestValidator.equals("Public comment post_id")(pub?.post_id)(post.id);
  TestValidator.equals("Private comment post_id")(priv?.post_id)(post.id);
}
