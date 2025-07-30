import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that an administrator can successfully perform a complex search for
 * attachments on a given post using multiple filter criteria.
 *
 * Business context:
 *
 * - Community/admins often work with large posts that can have many attached
 *   files (images, documents, etc.), requiring robust search/filter UI and
 *   backend.
 * - This test simulates admin workflows by bulk-attaching files and running
 *   filtered searches to ensure only relevant files are returned for each
 *   query.
 *
 * Steps:
 *
 * 1. Create a new post (as admin user)
 * 2. Upload five attachments to the post with controlled variety in file_type,
 *    file_size, and time (insert small delay to guarantee timestamp
 *    distinctions)
 * 3. Search by file_type filter (e.g., only 'image/jpeg'), verify only matching
 *    files returned
 * 4. Search by file_size_min and file_size_max range, verify all results fit the
 *    bounds
 * 5. Search by created_from and created_to (time window), verify results fit
 *    window
 * 6. Compound filter (file_type + file_size_min), ensure intersection only
 * 7. Edge case: filter for audio file type not present => zero results
 * 8. Edge: search without filters (should return all attachments)
 * 9. Pagination with limit=2, verify correct number returned
 *
 * Each response and key result is validated by TestValidator, and types via
 * typia.assert.
 */
export async function test_api_aimall_backend_administrator_posts_attachments_test_admin_search_post_attachments_with_complex_filters(
  connection: api.IConnection,
) {
  // 1. Create new post as admin
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(5),
        body: RandomGenerator.paragraph()(15),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload five attachments with variety for robust filter testing
  // Use small pauses to guarantee distinct created_at timestamps
  const now = Date.now();
  const uploads = [
    { file_type: "image/jpeg", file_size: 12345 },
    { file_type: "application/pdf", file_size: 44444 },
    { file_type: "image/png", file_size: 90000 },
    { file_type: "video/mp4", file_size: 150000 },
    { file_type: "image/jpeg", file_size: 77777 },
  ];
  const attachments: IAimallBackendAttachment[] = [];
  for (const meta of uploads) {
    // Ensure file_uri uniqueness
    const att =
      await api.functional.aimall_backend.administrator.posts.attachments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            file_uri: RandomGenerator.alphaNumeric(16),
            file_type: meta.file_type,
            file_size: meta.file_size,
          } satisfies IAimallBackendAttachment.ICreate,
        },
      );
    typia.assert(att);
    attachments.push(att);
    // Small delay to ensure created_at separation
    await new Promise((res) => setTimeout(res, 20));
  }

  // 3. Filter by file_type ("image/jpeg")
  let searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { file_type: "image/jpeg" },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("file_type filter count")(searchRes.data.length)(2);
  TestValidator.predicate("all results jpeg")(
    searchRes.data.every((a) => a.file_type === "image/jpeg"),
  );

  // 4. Filter by file_size between 20000 and 100000
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { file_size_min: 20000, file_size_max: 100000 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("size range count")(searchRes.data.length)(3);
  TestValidator.predicate("all in size range")(
    searchRes.data.every(
      (a) =>
        typeof a.file_size === "number" &&
        a.file_size >= 20000 &&
        a.file_size <= 100000,
    ),
  );

  // 5. Filter by created_from/created_to: window covering only attachments 2 and 3
  // Use the actual created_at values for rigorous filtering
  const sorted = attachments
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const fromDate = sorted[1].created_at; // Second earliest
  const toDate = sorted[2].created_at; // Third earliest
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { created_from: fromDate, created_to: toDate },
      },
    );
  typia.assert(searchRes);
  // Results should be 2nd and 3rd attachments only
  TestValidator.equals("created_at window count")(searchRes.data.length)(2);
  TestValidator.predicate("created_at within window")(
    searchRes.data.every(
      (a) => a.created_at >= fromDate && a.created_at <= toDate,
    ),
  );

  // 6. Compound filter: image/jpeg files with size >= 50000
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { file_type: "image/jpeg", file_size_min: 50000 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("compound filter")(searchRes.data.length)(1);
  TestValidator.predicate("jpeg+size ok")(
    searchRes.data[0].file_type === "image/jpeg" &&
      searchRes.data[0].file_size >= 50000,
  );

  // 7. Edge: audio type not present yields zero
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { file_type: "audio/mpeg" },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("no result audio")(searchRes.data.length)(0);

  // 8. No filters (empty body) => all attachments returned
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("all attachments")(searchRes.data.length)(
    attachments.length,
  );

  // 9. Pagination: limit=2 returns just 2
  searchRes =
    await api.functional.aimall_backend.administrator.posts.attachments.search(
      connection,
      {
        postId: post.id,
        body: { limit: 2 },
      },
    );
  typia.assert(searchRes);
  TestValidator.equals("pagination limit")(searchRes.data.length)(2);
}
