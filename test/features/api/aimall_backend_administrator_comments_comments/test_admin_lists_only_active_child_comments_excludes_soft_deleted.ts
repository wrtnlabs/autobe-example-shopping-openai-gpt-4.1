import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate administrator comment thread listing excludes soft-deleted child
 * comments.
 *
 * Scenario: Ensures that even administrators, when listing child comments
 * (replies) for a parent comment, receive only active (not soft-deleted)
 * comments. This test covers thread integrity—soft-deleted comments (deleted_at
 * not null) must never appear in standard list APIs, even with admin
 * privilege.
 *
 * Workflow:
 *
 * 1. Create a root parent comment as a customer.
 * 2. Attach multiple (3) child comments (replies) to the parent comment.
 * 3. Soft-delete one of the child comments (simulate `deleted_at`).
 * 4. As administrator, list all child comments for that parent via admin API.
 * 5. Assert: (a) All returned child comments have `deleted_at === null`; (b) The
 *    soft-deleted child's id is absent from result; (c) Each result's parent_id
 *    matches the parent comment id.
 */
export async function test_api_aimall_backend_administrator_comments_comments_index_only_active(
  connection: api.IConnection,
) {
  // 1. Create root parent comment as customer (thread root).
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create multiple (3) child comments as customer.
  const childComments = await ArrayUtil.asyncRepeat(3)(async () =>
    api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          parent_id: parentComment.id,
          body: RandomGenerator.content()()(),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    ),
  );
  childComments.forEach((child) => typia.assert(child));

  // 3. Soft-delete one child comment (index 1).
  const deletedComment = childComments[1];
  await api.functional.aimall_backend.customer.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: deletedComment.id,
    },
  );

  // 4. As administrator, list all children for the parent comment.
  const adminChildList =
    await api.functional.aimall_backend.administrator.comments.comments.index(
      connection,
      {
        commentId: parentComment.id,
      },
    );
  typia.assert(adminChildList);

  // 5. Assert every child in result:
  //   (a) deleted_at === null
  //   (b) Not the soft-deleted id
  //   (c) parent_id matches
  adminChildList.data.forEach((comment) => {
    TestValidator.equals("child comment not deleted")(comment.deleted_at)(null);
    TestValidator.notEquals("should not return soft-deleted child")(comment.id)(
      deletedComment.id,
    );
    TestValidator.equals("parent child linkage")(comment.parent_id)(
      parentComment.id,
    );
  });

  // Additionally, check that count matches (original #children - deleted ones)
  const expectedActiveIds = childComments
    .filter((c, idx) => idx !== 1)
    .map((c) => c.id);
  TestValidator.equals("count of active children")(adminChildList.data.length)(
    expectedActiveIds.length,
  );
  // Ensure all expected ids appear
  expectedActiveIds.forEach((id) => {
    TestValidator.predicate(`active child ${id} is present`)(
      adminChildList.data.some((c) => c.id === id),
    );
  });
}
