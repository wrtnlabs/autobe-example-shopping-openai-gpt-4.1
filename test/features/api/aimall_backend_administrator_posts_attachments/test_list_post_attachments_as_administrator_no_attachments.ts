import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";

/**
 * Validates retrieval of empty attachment set for a new administrator-created
 * post.
 *
 * This test ensures the API correctly returns an empty attachment result list
 * (with proper pagination metadata) for a post that has no attachments. The
 * test workflow is as follows:
 *
 * 1. Create a new post as administrator (using API).
 * 2. Without uploading any attachments, request the list of attachments for that
 *    post via GET endpoint.
 * 3. Assert the response's data array is empty and pagination fields reflect zero
 *    results (records=0, pages=0).
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_list_post_attachments_as_administrator_no_attachments(
  connection: api.IConnection,
) {
  // 1. Create a new post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Query for attachments for the post (should be empty)
  const attachmentsPage =
    await api.functional.aimall_backend.administrator.posts.attachments.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(attachmentsPage);

  // 3. Validate that no attachments are present and pagination is correct
  TestValidator.equals("Should return empty data array")(attachmentsPage.data)(
    [],
  );
  TestValidator.equals("Pagination.records should be zero")(
    attachmentsPage.pagination.records,
  )(0);
  TestValidator.equals("Pagination.pages should be zero")(
    attachmentsPage.pagination.pages,
  )(0);
}
