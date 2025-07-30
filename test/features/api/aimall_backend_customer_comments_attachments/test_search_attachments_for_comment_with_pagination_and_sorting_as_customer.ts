import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced attachment searching for a comment with pagination and sorting.
 *
 * This test validates the scenario where a customer uploads multiple
 * attachments to a comment, then searches attachments using pagination. It
 * verifies that pagination, record counts, and descending creation time order
 * (newest first) are enforced as expected.
 *
 * 1. Create a new comment as a customer
 * 2. Upload several (5) attachments to that comment
 * 3. Perform an attachment search (PATCH) with limit=2 and page=1, expect
 *    newest-first ordering
 * 4. Verify returned results: count per page, total count, and correct ordering by
 *    created_at
 * 5. Fetch second page and validate
 * 6. Test out-of-bounds pagination (empty data)
 */
export async function test_api_aimall_backend_customer_comments_attachments_search_with_pagination_sorting(
  connection: api.IConnection,
) {
  // 1. Create a new comment as a customer
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Upload several attachments to the comment
  const attachmentPayloads: IAimallBackendAttachment.ICreate[] =
    ArrayUtil.repeat(5)(() => ({
      comment_id: comment.id,
      file_uri: `s3://test-bucket/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
      file_type: "image/jpeg",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<4096000>
      >(),
    }));
  const attachments: IAimallBackendAttachment[] = [];
  for (const payload of attachmentPayloads) {
    const att =
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: payload,
        },
      );
    typia.assert(att);
    attachments.push(att);
  }

  // 3. Search attachments: limit 2, page 1 (expect newest first)
  const searchReq: IAimallBackendAttachment.IRequest = {
    comment_id: comment.id,
    limit: 2,
    page: 1,
  };
  const searchRes =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: searchReq,
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("total record count")(searchRes.pagination.records)(
    attachments.length,
  );
  TestValidator.equals("page size")(searchRes.data.length)(2);
  for (let i = 1; i < searchRes.data.length; ++i) {
    TestValidator.predicate("created_at desc order")(
      searchRes.data[i - 1].created_at >= searchRes.data[i].created_at,
    );
  }

  // 4. Fetch and validate second page
  const searchResPage2 =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { ...searchReq, page: 2 },
      },
    );
  typia.assert(searchResPage2);
  TestValidator.equals("page 2 size")(searchResPage2.data.length)(2);

  // 5. Fetch last/out-of-bounds page; expect empty array
  const lastPage = Math.ceil(attachments.length / 2);
  const searchResLastPage =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: { ...searchReq, page: lastPage + 1 },
      },
    );
  typia.assert(searchResLastPage);
  TestValidator.equals("empty last page")(searchResLastPage.data.length)(0);
}
