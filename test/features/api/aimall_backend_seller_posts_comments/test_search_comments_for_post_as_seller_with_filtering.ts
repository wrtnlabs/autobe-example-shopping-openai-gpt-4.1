import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching and filtering comments for a seller post, covering filter and
 * privacy scenarios.
 *
 * Business context:
 *
 * - The test ensures that comment search/filtering features work for seller
 *   posts.
 * - It verifies core filterable fields: author (customer_id), privacy
 *   (is_private), as well as pagination, and their combinations.
 * - It simulates varied business cases—different authors, privacy states, and
 *   ensures privacy rules and result boundaries are honored.
 *
 * Steps:
 *
 * 1. Create a seller post to serve as the target for comments.
 * 2. Add multiple comments with different (simulated) authors and privacy flags to
 *    the post.
 * 3. Use the PATCH search endpoint to apply various filters:
 *
 *    - By comment author (customer_id)
 *    - By privacy flag (is_private)
 *    - General listing for the post with pagination
 *    - Combined filter (author+privacy)
 * 4. Validate all search responses: fields filtered correctly, privacy rules
 *    enforced, and pagination boundary respected.
 */
export async function test_api_aimall_backend_seller_posts_comments_test_search_comments_for_post_as_seller_with_filtering(
  connection: api.IConnection,
) {
  // 1. Create a new seller post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Add a set of comments with varied authors and privacy flags
  const testAuthors: (string | null)[] = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
    null, // anonymous simulation if system allows
  ];
  const commentBodies = [
    "Great article!",
    "Needs more details.",
    "Private seller note.",
  ];
  const privacies = [false, true, false];
  const createdComments: IAimallBackendComment[] = [];
  for (let i = 0; i < testAuthors.length; ++i) {
    const comment =
      await api.functional.aimall_backend.seller.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            body: commentBodies[i],
            is_private: privacies[i],
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 3. Search by author (customer_id), if available
  if (createdComments[0].customer_id) {
    const byAuthor =
      await api.functional.aimall_backend.seller.posts.comments.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            customer_id: createdComments[0].customer_id,
          } satisfies IAimallBackendComment.IRequest,
        },
      );
    typia.assert(byAuthor);
    TestValidator.predicate("filtered by author")(
      byAuthor.data.every(
        (c) => c.customer_id === createdComments[0].customer_id,
      ),
    );
  }

  // 4. Search by privacy flag
  const byPrivacy =
    await api.functional.aimall_backend.seller.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          is_private: true,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(byPrivacy);
  TestValidator.predicate("filtered by privacy")(
    byPrivacy.data.every((c) => c.is_private === true),
  );

  // 5. Listing with pagination (limit = 2)
  const paginated =
    await api.functional.aimall_backend.seller.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          page: 1,
          limit: 2,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("pagination limit")(paginated.data.length)(2);

  // 6. Combined filter (author + privacy), if available
  if (createdComments[1].customer_id) {
    const combined =
      await api.functional.aimall_backend.seller.posts.comments.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            customer_id: createdComments[1].customer_id,
            is_private: true,
          } satisfies IAimallBackendComment.IRequest,
        },
      );
    typia.assert(combined);
    TestValidator.predicate("combined filter")(
      combined.data.every(
        (c) =>
          c.customer_id === createdComments[1].customer_id &&
          c.is_private === true,
      ),
    );
  }
}
