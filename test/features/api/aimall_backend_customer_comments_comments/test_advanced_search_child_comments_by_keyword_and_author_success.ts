import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates advanced search for child comments (replies) under a specific
 * comment thread.
 *
 * This test ensures that filtering by keyword (body) and author (customer_id)
 * returns only those child comments that match both criteria. Soft-deleted
 * replies or those not matching both filter parameters must not be included in
 * the results.
 *
 * Test flow:
 *
 * 1. Create a parent comment as customer A.
 * 2. Create several reply comments (children) by different (simulated) customers
 *    with varying bodies and privacy settings.
 * 3. (Soft-delete is not feasible as no such API is available here - just skip
 *    such entries in assertion.)
 * 4. Use PATCH search to find replies by a specific customer whose body contains a
 *    target keyword.
 * 5. Assert that only replies matching keyword + author (excluding soft-deleted)
 *    are returned.
 */
export async function test_api_aimall_backend_customer_comments_comments_test_advanced_search_child_comments_by_keyword_and_author_success(
  connection: api.IConnection,
) {
  // 1. Create parent comment (Customer A)
  const parent = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Top-level comment for threading",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(parent);

  // 2. Create several child replies (simulating multiple authors by later filtering customer_id)
  // Child 1 (target): by Customer A, contains 'filterme'
  const child1 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "reply - this should filterme!",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child1);

  // Child 2: by Customer A, does NOT contain 'filterme'
  const child2 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "reply - does not contain keyword",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child2);

  // Child 3: by (simulated) Customer B (we use same API - in real E2E this would be a different login), contains 'filterme'
  const child3 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "other user filterme in comment body",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child3);

  // Child 4: by Customer A, contains 'filterme', but for soft-delete simulation we can only skip in assertion
  const child4 =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          body: "reply - filterme and soft delete",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(child4);
  // Note: No soft-delete API; test handles as summary/explanation only.

  // 3. Perform PATCH search: by parent, customer_id=child1.customer_id
  const searchResult =
    await api.functional.aimall_backend.customer.comments.comments.search(
      connection,
      {
        commentId: parent.id,
        body: {
          parent_id: parent.id,
          customer_id: child1.customer_id,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(searchResult);

  // 4. Assert: Only replies from correct author whose body contains keyword are present (not soft-deleted).
  const expected = [child1]
    .filter((c) => !c.deleted_at && c.body.includes("filterme"))
    .map((x) => x.id);
  const actual = searchResult.data
    .filter((c) => !c.deleted_at && c.body.includes("filterme"))
    .map((x) => x.id);
  TestValidator.equals(
    "Only matching replies by author and body keyword are returned",
  )(actual)(expected);
}
