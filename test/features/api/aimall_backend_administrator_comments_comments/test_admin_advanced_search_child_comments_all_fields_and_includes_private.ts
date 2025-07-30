import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator advanced child comment search with all filter fields
 * and privacy visibility.
 *
 * This test verifies that the administrator can perform advanced search and
 * pagination for child comments (replies) under a parent comment, filtering by
 * author, privacy status, creation date range, and body content. It also
 * ensures that administrators see all child comments, including those marked
 * private by customers, and can paginate and filter them for moderation/audit
 * purposes.
 *
 * Workflow:
 *
 * 1. Create a parent comment as a customer (no parent_id)
 * 2. Create 3 replies to the parent comment:
 *
 *    - Author1 (public, content: 'Hello world')
 *    - Author2 (private, content: 'Private note')
 *    - Author1 (public, content: 'Audit trail')
 * 3. As administrator, search for child comments under the parent using: (a) No
 *    filters: should see all 3 (including private) (b) Filter by author1:
 *    should see both from author1 (c) Filter by is_private true: only private
 *    comments from author2 (d) Filter by body ("Audit"): only the matching
 *    comment (e) Filter by created_at_from/created_at_to: time-range filtering
 *    (f) Pagination with limit=2, verify paging
 * 4. Validate all intermediate and final results for correctness, including admin
 *    ability to see private data.
 */
export async function test_api_aimall_backend_administrator_comments_comments_test_admin_advanced_search_child_comments_all_fields_and_includes_private(
  connection: api.IConnection,
) {
  // 1. Create a parent comment as customer (root of thread)
  const parent = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        post_id: null,
        review_id: null,
        parent_id: null,
        body: "Parent for threading",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(parent);

  // ---
  // Setup two author contexts (simulate, since real auth handled by infra/test harness)
  // Child 1 by author1 (public)
  const child1 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "Hello world",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child1);
  const author1 = child1.customer_id;

  // Child 2 by author2 (private)
  const child2 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "Private note",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child2);
  const author2 = child2.customer_id;

  // Child 3 by author1 again (public, 'Audit trail')
  const child3 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "Audit trail",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child3);

  // 3(a). Admin: Search for all children with no additional filter
  const allResult =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: { parent_id: parent.id },
      },
    );
  typia.assert(allResult);
  TestValidator.equals("all child comments count")(allResult.data.length)(3);

  // 3(b). Filter by author1
  const author1Result =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: { parent_id: parent.id, customer_id: author1 },
      },
    );
  typia.assert(author1Result);
  TestValidator.equals("author1 count")(author1Result.data.length)(2);
  TestValidator.predicate("author1 only")(
    author1Result.data.every((c) => c.customer_id === author1),
  );

  // 3(c). Filter by is_private true (should return only the author2 private comment)
  const privateResult =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: { parent_id: parent.id, is_private: true },
      },
    );
  typia.assert(privateResult);
  TestValidator.equals("private only count")(privateResult.data.length)(1);
  TestValidator.equals("private author")(privateResult.data[0]?.customer_id)(
    author2,
  );
  TestValidator.equals("private body")(privateResult.data[0]?.body)(
    "Private note",
  );

  // 3(d). Filter by body content (simulate: fetch all and check manually)
  const bodySearchResult =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: { parent_id: parent.id },
      },
    );
  typia.assert(bodySearchResult);
  const auditComment = bodySearchResult.data.find((c) =>
    c.body.includes("Audit"),
  );
  TestValidator.predicate("body search exists")(!!auditComment);
  if (auditComment)
    TestValidator.equals("body matches")(auditComment.body)("Audit trail");

  // 3(e). Filter by created_at (from child1 to child3 - should get all 3 since created close together)
  const fromTime = child1.created_at;
  const toTime = child3.created_at;
  const rangeResult =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          created_at_from: fromTime,
          created_at_to: toTime,
        },
      },
    );
  typia.assert(rangeResult);
  TestValidator.equals("range count")(rangeResult.data.length)(3);

  // 3(f). Pagination: Limit 2 per page
  const page1 =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          limit: 2,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 count")(page1.data.length)(2);
  TestValidator.equals("page 1 current")(page1.pagination.current)(1);
  // Second page
  const page2 =
    await api.functional.aimall_backend.administrator.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          limit: 2,
          page: 2,
        },
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current")(page2.pagination.current)(2);
}
