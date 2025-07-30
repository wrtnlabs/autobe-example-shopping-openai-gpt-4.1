import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates the administrator search/filter functionality on comments for date
 * range.
 *
 * This test ensures that the administrator can retrieve comments based on
 * specific filter criteria (date ranges). Multiple comments are created at
 * various times, and searches are performed using PATCH with a created_at_from
 * and created_at_to filter. Results are validated to confirm filtering
 * accuracy. Since comment authorship cannot be simulated nor can status
 * (soft-delete) be set via the API, those scenarios are omitted.
 *
 * Step-by-step process:
 *
 * 1. Create two posts.
 * 2. Create comments on these posts at different times (simulate date spacing).
 * 3. As administrator, search/filter by a created_at range.
 * 4. Validate that filtered comments' created_at are within the range.
 */
export async function test_api_aimall_backend_administrator_comments_test_search_comments_by_author_status_and_range(
  connection: api.IConnection,
) {
  // 1. Create two posts
  const post1 = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post2);

  // 2. Create comments at controlled intervals
  const comment1 =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post1.id,
        body: {
          body: "Comment 1 on post 1",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment1);
  await new Promise((res) => setTimeout(res, 1000));

  const comment2 =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post1.id,
        body: {
          body: "Comment 2 on post 1",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment2);
  await new Promise((res) => setTimeout(res, 1000));

  const comment3 =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post2.id,
        body: {
          body: "Comment 1 on post 2",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(comment3);

  // 3. Search/filter by created_at range
  const dt_from = comment1.created_at;
  const dt_to = comment3.created_at;
  const searchByRange =
    await api.functional.aimall_backend.administrator.comments.search(
      connection,
      {
        body: {
          created_at_from: dt_from,
          created_at_to: dt_to,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(searchByRange);
  TestValidator.predicate("All results in created_at range")(
    searchByRange.data.every(
      (c) => c.created_at >= dt_from && c.created_at <= dt_to,
    ),
  );
}
