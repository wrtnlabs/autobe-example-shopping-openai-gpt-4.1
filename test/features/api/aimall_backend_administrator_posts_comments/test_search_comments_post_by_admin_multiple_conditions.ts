import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator-side advanced comment search for a specific post,
 * using filtering and pagination (is_private, pagination, and supported fields
 * only).
 *
 * 1. Create a new community post as customer
 * 2. Add a mix of public/private comments to this post (simulate authorship if
 *    possible via customer_id, otherwise only vary is_private and content)
 * 3. As admin, search and filter comments with: no filter (all), is_private true,
 *    is_private false, and pagination boundary tests (e.g. page=2, limit=2)
 * 4. For each query, validate the result count and that each entry matches the
 *    filter
 */
export async function test_api_aimall_backend_administrator_posts_comments_test_search_comments_post_by_admin_multiple_conditions(
  connection: api.IConnection,
) {
  // 1. Create a new community post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.alphabets(10),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Add a mix of comments (public/private, different body)
  const comments = [
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: { body: "Public comment 1", is_private: false },
      },
    ),
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: { body: "Private comment 1", is_private: true },
      },
    ),
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: { body: "Public comment 2", is_private: false },
      },
    ),
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: { body: "Private comment 2", is_private: true },
      },
    ),
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: { body: "Public comment 3", is_private: false },
      },
    ),
  ];
  comments.forEach((comment) => typia.assert(comment));

  // 3a. No filter: should get all comments
  const all =
    await api.functional.aimall_backend.administrator.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(all);
  TestValidator.equals("all comments returned")(all.data.length)(5);

  // 3b. Filter: is_private true
  const priv =
    await api.functional.aimall_backend.administrator.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: { is_private: true },
      },
    );
  typia.assert(priv);
  TestValidator.equals("only private count")(priv.data.length)(2);
  TestValidator.predicate("all private")(priv.data.every((c) => c.is_private));

  // 3c. Filter: is_private false
  const pub =
    await api.functional.aimall_backend.administrator.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: { is_private: false },
      },
    );
  typia.assert(pub);
  TestValidator.equals("only public count")(pub.data.length)(3);
  TestValidator.predicate("all public")(pub.data.every((c) => !c.is_private));

  // 3d. Pagination (limit=2, page=2)
  const page2 =
    await api.functional.aimall_backend.administrator.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: { page: 2, limit: 2 },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page2 current")(page2.pagination.current)(2);
  TestValidator.equals("page2 limit")(page2.pagination.limit)(2);
  TestValidator.predicate("data length <= limit")(page2.data.length <= 2);
}
