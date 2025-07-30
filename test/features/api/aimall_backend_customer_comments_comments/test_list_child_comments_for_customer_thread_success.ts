import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates retrieving child comments (direct replies) for a threaded
 * discussion comment.
 *
 * This test ensures that a customer can view the list of direct reply comments
 * (children) under a parent comment using the API endpoint. It covers a typical
 * thread expansion scenario:
 *
 * 1. Create a parent comment as the customer (root of the thread)
 * 2. Create multiple visible child comments as replies
 * 3. (Optionally) Attempt to create a deleted child comment (skipped, since no
 *    delete API is present)
 * 4. Retrieve all active child comments using the GET
 *    /aimall-backend/customer/comments/{commentId}/comments endpoint
 * 5. Validate that all created children are listed, only visible (non-deleted)
 *    comments are returned, with correct parent linkage structure
 *
 * Precondition: Customer is authenticated and allowed to post comments and
 * replies
 *
 * Validates correct listing, threading, and filtering for community comment
 * threads.
 */
export async function test_api_aimall_backend_customer_comments_comments_index(
  connection: api.IConnection,
) {
  // 1. Create a parent comment (thread root)
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Create several active child comments as replies under the parent
  const childComments = await ArrayUtil.asyncRepeat(3)(async () => {
    const child =
      await api.functional.aimall_backend.customer.comments.comments.create(
        connection,
        {
          commentId: parentComment.id,
          body: {
            parent_id: parentComment.id,
            body: RandomGenerator.paragraph()(),
            is_private: false,
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    typia.assert(child);
    return child;
  });

  // 3. (Optional) Attempt to create a deleted child comment — skipped (no API to soft delete comment)

  // 4. Retrieve all child comments for the parent
  const output =
    await api.functional.aimall_backend.customer.comments.comments.index(
      connection,
      {
        commentId: parentComment.id,
      },
    );
  typia.assert(output);

  // 5. Validate: all created children are present, only visible comments returned, parent linkage correct
  const outputIds = output.data.map((c) => c.id);
  for (const child of childComments) {
    TestValidator.predicate(`child comment ${child.id} present in output`)(
      outputIds.includes(child.id),
    );
    TestValidator.equals(`parent_id correct for child ${child.id}`)(
      child.parent_id,
    )(parentComment.id);
    TestValidator.equals(`deleted_at should be null for child ${child.id}`)(
      child.deleted_at,
    )(null);
  }
  for (const c of output.data) {
    TestValidator.equals("parent_id is always parent comment")(c.parent_id)(
      parentComment.id,
    );
    TestValidator.equals("only visible comments")(c.deleted_at)(null);
  }
}
