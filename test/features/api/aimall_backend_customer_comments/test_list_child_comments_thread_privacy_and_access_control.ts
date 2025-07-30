import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate thread privacy and access control for child comments listing.
 *
 * This test ensures that a customer can only see child comments for which they
 * have permission, based on the privacy setting (is_private) of each comment.
 *
 * Scenario:
 *
 * 1. Customer A creates a parent/root comment.
 * 2. Customer A adds a child reply (private) to their own parent comment.
 * 3. Customer B adds two replies under the parent: one public, one private.
 * 4. Customer C attempts to list all child comments of the parent.
 *
 * Expectations:
 *
 * - Customer C must see only public replies.
 * - Customer C should not see private replies created by other users (including A
 *   and B).
 * - Replies should be visible based on their is_private flags (public visible,
 *   private not visible).
 */
export async function test_api_aimall_backend_customer_comments_test_list_child_comments_thread_privacy_and_access_control(
  connection: api.IConnection,
) {
  // (Assume each customer is pre-authenticated on their turn: context limitation.)
  // 1. Customer A creates a parent/root comment (public)
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: "Parent comment by A",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Customer A creates PRIVATE child reply
  const privateReplyA =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          body: "A's private reply",
          is_private: true,
          parent_id: parentComment.id,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateReplyA);

  // (Switch to Customer B)
  // 3. Customer B creates PUBLIC child reply
  const publicReplyB =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          body: "B's public reply",
          is_private: false,
          parent_id: parentComment.id,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicReplyB);

  // 4. Customer B creates PRIVATE child reply
  const privateReplyB =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          body: "B's private reply",
          is_private: true,
          parent_id: parentComment.id,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateReplyB);

  // (Switch to Customer C)
  // 5. Customer C requests the list of child comments for the parent
  const listResult =
    await api.functional.aimall_backend.customer.comments.comments.index(
      connection,
      {
        commentId: parentComment.id,
      },
    );
  typia.assert(listResult);

  // 6. Validate that only the public reply (from B) is present; private replies not visible.
  const visibleIds = listResult.data.map((c) => c.id);
  TestValidator.predicate("Customer C only sees public reply from B")(
    visibleIds.includes(publicReplyB.id) &&
      !visibleIds.includes(privateReplyA.id) &&
      !visibleIds.includes(privateReplyB.id),
  );
}
