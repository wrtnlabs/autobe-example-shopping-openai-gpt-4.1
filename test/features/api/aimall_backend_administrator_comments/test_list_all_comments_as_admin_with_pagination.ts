import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that an administrator can successfully retrieve a paginated list of
 * all community comments.
 *
 * This test checks the administrator comments listing feature by
 * programmatically creating several posts and comments, then invoking the
 * administrative listing API and verifying the expected results.
 *
 * Steps:
 *
 * 1. Create two distinct posts (to ensure there are multiple threads for
 *    comments).
 * 2. For each post, create several comments with various privacy settings
 *    (is_private true/false).
 * 3. As (mocked) administrator, call GET /aimall-backend/administrator/comments to
 *    retrieve the comment list.
 * 4. Validate that the returned list contains all created comments, with correct
 *    key fields (body, post_id, is_private, author, timestamps, etc).
 * 5. Verify pagination meta fields (such as total record count) reflect the
 *    inserted comments.
 */
export async function test_api_aimall_backend_administrator_comments_test_list_all_comments_as_admin_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create two community posts as a customer
  const postBodies = [
    {
      title: RandomGenerator.paragraph()(2),
      body: RandomGenerator.content()(2)(),
      is_private: false,
    } satisfies IAimallBackendPost.ICreate,
    {
      title: RandomGenerator.paragraph()(2),
      body: RandomGenerator.content()(2)(),
      is_private: true,
    } satisfies IAimallBackendPost.ICreate,
  ];

  const createdPosts: IAimallBackendPost[] = [];
  for (const postBody of postBodies) {
    const post = await api.functional.aimall_backend.customer.posts.create(
      connection,
      {
        body: postBody,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
  }

  // 2. For each post, create 2 comments (one public, one private)
  const createdComments: IAimallBackendComment[] = [];
  for (const post of createdPosts) {
    for (const is_private of [false, true]) {
      const commentBody = {
        body: RandomGenerator.paragraph()(),
        is_private,
      } satisfies Omit<IAimallBackendComment.ICreate, "post_id">;
      const comment =
        await api.functional.aimall_backend.customer.posts.comments.create(
          connection,
          {
            postId: post.id,
            body: {
              ...commentBody,
            },
          },
        );
      typia.assert(comment);
      createdComments.push(comment);
    }
  }

  // 3. Retrieve all comments via the admin endpoint
  const resp =
    await api.functional.aimall_backend.administrator.comments.index(
      connection,
    );
  typia.assert(resp);

  // 4. Compare created comments are present; check essential fields
  for (const created of createdComments) {
    const found = resp.data.find((c) => c.id === created.id);
    TestValidator.predicate("Created comment present in admin list")(!!found);
    if (found) {
      TestValidator.equals("Comment body matches")(found.body)(created.body);
      TestValidator.equals("Post ID matches")(found.post_id)(created.post_id);
      TestValidator.equals("Privacy matches")(found.is_private)(
        created.is_private,
      );
      TestValidator.equals("Author matches")(found.customer_id)(
        created.customer_id,
      );
    }
  }

  // 5. Validate pagination metadata
  TestValidator.predicate("Record count meets new comments count")(
    resp.pagination.records >= createdComments.length,
  );
  TestValidator.equals("Pagination metadata present")(
    typeof resp.pagination.current,
  )("number");
  TestValidator.equals("Pagination metadata present")(
    typeof resp.pagination.limit,
  )("number");
  TestValidator.equals("Pagination metadata present")(
    typeof resp.pagination.records,
  )("number");
  TestValidator.equals("Pagination metadata present")(
    typeof resp.pagination.pages,
  )("number");
}
