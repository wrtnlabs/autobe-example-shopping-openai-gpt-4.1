import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search, pagination, and filtering behavior for large
 * attachment sets on comments by administrator.
 *
 * This test checks the ability to search and paginate a large number of
 * attachments belonging to a single comment as an administrator, filtering by a
 * file property (such as file_size). The test ensures pagination and filtering
 * both work correctly at scale.
 *
 * Step-by-step breakdown:
 *
 * 1. Create a community comment as a customer (to attach files to).
 * 2. Bulk create (upload) a large number of attachments to the created comment
 *    with diverse file_size values, ensuring some are above and some below a
 *    chosen file_size threshold.
 * 3. As an administrator, issue a search (PATCH) request against the comment's
 *    attachments with: a. Pagination (page 1, limit = page size) b. Filter
 *    (file_size_min = threshold) so only attachments above threshold are
 *    returned
 * 4. Validate that:
 *
 *    - Response pagination metadata matches expected counts (limit, records, pages,
 *         etc.)
 *    - All returned data items meet the filter criteria (file_size >= threshold)
 *    - Total records count matches the total number matching filter
 *    - Multiple pages exist if over page size, or only one page otherwise
 *    - Edge case: if page > max pages, get empty data
 */
export async function test_api_aimall_backend_administrator_comments_attachments_test_advanced_attachment_search_by_administrator_for_large_comment_attachment_set(
  connection: api.IConnection,
) {
  // 1. Create a community comment as setup
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

  // 2. Bulk upload many attachments with diverse file_size
  const ATTACHMENT_COUNT = 25; // over standard pagination size (e.g., 10/20 typical)
  // threshold: split around 75% above, 25% below
  const threshold = 500000; // 500KB
  const aboveThresholdSizes = Array(19)
    .fill(0)
    .map(
      () =>
        threshold +
        typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000000>
        >(),
    );
  const belowThresholdSizes = Array(6)
    .fill(0)
    .map(() =>
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<499999>
      >(),
    );
  const sizes = [...aboveThresholdSizes, ...belowThresholdSizes];
  // shuffle array so file_size ordering is not predictable
  for (let i = sizes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sizes[i], sizes[j]] = [sizes[j], sizes[i]];
  }

  /** @type {IAimallBackendAttachment[]} */
  const attachments = [];
  for (let idx = 0; idx < ATTACHMENT_COUNT; idx++) {
    const file_size = sizes[idx];
    const attachment =
      await api.functional.aimall_backend.customer.comments.attachments.create(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            file_uri: `s3://bucket/${comment.id}/file${idx}.jpg`,
            file_type: "image/jpeg",
            file_size,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    attachments.push(attachment);
    typia.assert(attachment);
  }

  // 3. Search attachments as admin filtered by file_size_min
  const limit = 10;
  const page = 1;
  const adminSearchRes =
    await api.functional.aimall_backend.administrator.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          comment_id: comment.id,
          file_size_min: threshold,
          limit,
          page,
        } satisfies IAimallBackendAttachment.IRequest,
      },
    );
  typia.assert(adminSearchRes);

  // 4. Validate all results meet filter, pagination/counts, total records
  TestValidator.equals("limit correct")(adminSearchRes.pagination.limit)(limit);
  TestValidator.equals("current page correct")(
    adminSearchRes.pagination.current,
  )(page);
  const matching = attachments.filter((a) => a.file_size >= threshold);
  TestValidator.equals("records equal number matching filter")(
    adminSearchRes.pagination.records,
  )(matching.length);
  TestValidator.predicate("all attachments in page match filter")(
    adminSearchRes.data.every((a) => a.file_size >= threshold),
  );

  // Check total pages
  const expectedPages = Math.ceil(matching.length / limit);
  TestValidator.equals("pages calculation")(adminSearchRes.pagination.pages)(
    expectedPages,
  );
  if (matching.length <= limit) {
    TestValidator.equals("all results returned if <= limit")(
      adminSearchRes.data.length,
    )(matching.length);
  } else {
    TestValidator.equals("page is limited")(adminSearchRes.data.length)(limit);
  }

  // 5. Edge: request page after last and get empty data
  if (expectedPages > 1) {
    const overPageRes =
      await api.functional.aimall_backend.administrator.comments.attachments.search(
        connection,
        {
          commentId: comment.id,
          body: {
            comment_id: comment.id,
            file_size_min: threshold,
            limit,
            page: expectedPages + 1,
          } satisfies IAimallBackendAttachment.IRequest,
        },
      );
    typia.assert(overPageRes);
    TestValidator.equals("empty data for page after max")(
      overPageRes.data.length,
    )(0);
  }
}
