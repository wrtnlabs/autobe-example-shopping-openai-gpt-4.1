import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates searching for attachments on a post with filter criteria that yield
 * no results.
 *
 * Business context:
 *
 * - Community administrators may filter post attachments for moderation or batch
 *   actions.
 * - The endpoint should gracefully return an empty set and correct pagination
 *   when filters match nothing.
 *
 * Test steps:
 *
 * 1. Create a new community post (no attachments).
 * 2. Search for attachments using a file_type filter that will never match real
 *    data (e.g., 'does/not-exist').
 * 3. Validate the output array is empty, and pagination fields reflect zero
 *    records/pages.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_admin_search_attachments_on_post_with_no_results(
  connection: api.IConnection,
) {
  // 1. Create a new post (no attachments)
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Search for attachments with a non-existent file_type
  const result =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {
          file_type: "does/not-exist",
          limit: 10,
          page: 1,
        },
      },
    );
  typia.assert(result);

  // 3. Assert empty result
  TestValidator.equals("attachments are empty")(result.data)([]);
  TestValidator.equals("no records")(result.pagination.records)(0);
  TestValidator.equals("zero pages")(result.pagination.pages)(0);
  TestValidator.equals("current page 1")(result.pagination.current)(1);
  TestValidator.equals("limit as requested")(result.pagination.limit)(10);
}
