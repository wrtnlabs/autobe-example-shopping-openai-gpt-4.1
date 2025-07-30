import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that soft-deleted child comments are excluded from child comment
 * lists.
 *
 * This test ensures compliance and privacy: when retrieving the list of replies
 * (child comments) to a comment, comments that have been soft-deleted
 * (deleted_at is set) must not be visible in regular query results. The test
 * flow covers creation, deletion (soft), and filtering verification for a
 * community comment thread.
 *
 * Steps:
 *
 * 1. Create a parent comment with specific content.
 * 2. Add several replies (child comments) to the parent, recording their IDs and
 *    recognizable bodies.
 * 3. Soft-delete some (not all) of the replies using their IDs.
 * 4. Request the list of replies for the parent comment.
 * 5. Confirm only non-deleted replies appear in the list. Soft-deleted replies
 *    must be absent. All visible entries must have deleted_at === null (or
 *    undefined), and all deleted ones absent. Extra: Ensure no data leaks of
 *    soft-deleted items.
 *
 * Each operation is type-checked and validated. The scenario simulates standard
 * customer behavior and validates business audit/compliance.
 */
export async function test_api_comments_test_list_child_comments_excludes_soft_deleted_entries(
  connection: api.IConnection,
) {
  // 1. Create a parent comment
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: "Parent comment for soft-delete index test",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Add several child comments (3 with recognizable content)
  const childInputs: IAimallBackendComment.ICreate[] = [
    { body: "Reply to delete A", is_private: false },
    { body: "Reply to keep", is_private: false },
    { body: "Reply to delete B", is_private: false },
  ];
  const childComments = await Promise.all(
    childInputs.map((input) =>
      api.functional.aimall_backend.customer.comments.comments.create(
        connection,
        {
          commentId: parentComment.id,
          body: input,
        },
      ),
    ),
  );
  for (const x of childComments) typia.assert(x);

  // 3. Soft-delete some child comments (first and last)
  await api.functional.aimall_backend.customer.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: childComments[0].id,
    },
  );
  await api.functional.aimall_backend.customer.comments.comments.erase(
    connection,
    {
      commentId: parentComment.id,
      childCommentId: childComments[2].id,
    },
  );

  // 4. List child comments (index)
  const page =
    await api.functional.aimall_backend.customer.comments.comments.index(
      connection,
      {
        commentId: parentComment.id,
      },
    );
  typia.assert(page);

  // 5. Assert: Only non-deleted (middle) child comment is present
  TestValidator.equals("one child comment remains")(page.data.length)(1);
  const present = page.data[0];
  TestValidator.equals("It is the non-deleted comment")(present.id)(
    childComments[1].id,
  );
  TestValidator.equals("body matches")(present.body)(childInputs[1].body);
  TestValidator.equals("deleted_at is null or undefined")(
    !!(present.deleted_at === null || present.deleted_at === undefined),
  )(true);
  // Extra: Make sure deleted child IDs do not appear
  const childIds = page.data.map((x) => x.id);
  TestValidator.predicate("no soft-deleted child present")(
    childIds.indexOf(childComments[0].id) === -1 &&
      childIds.indexOf(childComments[2].id) === -1,
  );
}
