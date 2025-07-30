import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validates the administrator's ability to retrieve the full set of comments
 * for a given post, including both public and private comments, regardless of
 * the role of the commenter.
 *
 * Steps:
 *
 * 1. Create a new post via the administrator endpoint (with full privileges),
 *    using IAimallBackendPost.ICreate.
 * 2. Add multiple comments to this post using the administrator endpoint, mixing:
 *
 *    - Public comment (is_private: false)
 *    - Private comment (is_private: true) (In a realistic multi-role test, we would
 *         use different authenticated users, but for this API and available
 *         auth, simulate by posting multiple comments, toggling is_private in
 *         IAimallBackendComment.ICreate.)
 * 3. Retrieve the list of comments for the post using the administrator's comments
 *    index endpoint.
 * 4. Validate:
 *
 *    - All comments (both public and private) are returned in the response data
 *         array.
 *    - Each comment has correct is_private status matching what was posted.
 *    - All posted comments (by content/body and privacy flag) are present in the API
 *         result.
 * 5. Edge Case: Add a third comment with duplicate content/body but a different
 *    privacy flag. Confirm both are returned and properly distinguishable by
 *    is_private.
 */
export async function test_api_aimall_backend_administrator_posts_comments_index_with_mixed_privacy(
  connection: api.IConnection,
) {
  // 1. Create a post as admin
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_private: false,
    // customer_id not set (admin)
  };
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Add public comment
  const publicBody = RandomGenerator.content()()();
  const publicComment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: publicBody,
          is_private: false,
        },
      },
    );
  typia.assert(publicComment);

  // 3. Add private comment
  const privateBody = RandomGenerator.content()()();
  const privateComment =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: privateBody,
          is_private: true,
        },
      },
    );
  typia.assert(privateComment);

  // 4. Add third comment with duplicate body, different is_private
  const dupeBody = RandomGenerator.content()()();
  const dupePublic =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: dupeBody,
          is_private: false,
        },
      },
    );
  const dupePrivate =
    await api.functional.aimall_backend.administrator.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: dupeBody,
          is_private: true,
        },
      },
    );
  typia.assert(dupePublic);
  typia.assert(dupePrivate);

  // 5. List all comments as admin
  const commentsPage =
    await api.functional.aimall_backend.administrator.posts.comments.index(
      connection,
      { postId: post.id },
    );
  typia.assert(commentsPage);

  // 6. Validate all created comments are visible and distinguishable
  const comments = commentsPage.data;
  // Validate public
  TestValidator.predicate("public comment present")(
    comments.some((c) => c.body === publicBody && c.is_private === false),
  );
  // Validate private
  TestValidator.predicate("private comment present")(
    comments.some((c) => c.body === privateBody && c.is_private === true),
  );
  // Validate both dupeBody (public and private)
  TestValidator.predicate("dupe public present")(
    comments.some((c) => c.body === dupeBody && c.is_private === false),
  );
  TestValidator.predicate("dupe private present")(
    comments.some((c) => c.body === dupeBody && c.is_private === true),
  );
}
