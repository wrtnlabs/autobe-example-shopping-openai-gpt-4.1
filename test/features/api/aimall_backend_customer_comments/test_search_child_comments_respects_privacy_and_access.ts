import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that child comment search enforces privacy and author access
 * control.
 *
 * Business Context:
 *
 * - Community allows both public and private comments.
 * - Replies (child comments) can be authored by any customer and marked private
 *   or public.
 * - A customer is only allowed to see public replies and their own private
 *   replies, never private replies of others.
 *
 * Test Workflow:
 *
 * 1. As Customer A, create a parent (root) comment.
 * 2. As Customer A, create a public child reply under the parent.
 * 3. As Customer A, create a private child reply under the parent.
 * 4. As Customer B, create a private child reply under the parent.
 * 5. As Customer B, search (PATCH) for all direct children of the parent comment.
 * 6. Validate returned data:
 *
 *    - Contains the public reply (from A)
 *    - Contains the private reply by Customer B
 *    - Does NOT contain the private reply by Customer A
 *    - Each returned comment is either public, or private and authored by Customer B
 *    - No comment is soft deleted (deleted_at is null)
 */
export async function test_api_aimall_backend_customer_comments_test_search_child_comments_respects_privacy_and_access(
  connection: api.IConnection,
) {
  // 1. As Customer A, create root comment.
  // [Assume Customer A session is already loaded in 'connection']
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.alphabets(10),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. As Customer A, create a public child reply
  const publicChild =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          parent_id: parentComment.id,
          body: RandomGenerator.alphabets(12),
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicChild);

  // 3. As Customer A, create a private child reply
  const privateChildA =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          parent_id: parentComment.id,
          body: RandomGenerator.alphabets(14),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateChildA);

  // 4. As Customer B, create a private child reply
  // [Assume connection for Customer B is loaded below.]
  // In runner, connection switch from Customer A → Customer B must occur here
  const privateChildB =
    await api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          parent_id: parentComment.id,
          body: RandomGenerator.alphabets(16),
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateChildB);

  // 5. As Customer B, search for all direct child comments of the parent comment
  const searchResult =
    await api.functional.aimall_backend.customer.comments.comments.search(
      connection,
      {
        commentId: parentComment.id,
        body: { parent_id: parentComment.id },
      },
    );
  typia.assert(searchResult);
  const returned = searchResult.data;
  const returnedIds = returned.map((c) => c.id);
  // 6a. Contains public reply
  TestValidator.predicate("Contains public reply")(
    returnedIds.includes(publicChild.id),
  );
  // 6b. Contains B's own private reply
  TestValidator.predicate("Contains private reply by B")(
    returnedIds.includes(privateChildB.id),
  );
  // 6c. Does not contain A's private reply
  TestValidator.predicate("Does not contain private reply by A")(
    !returnedIds.includes(privateChildA.id),
  );
  // 6d. All are either public or private and authored by Customer B
  for (const reply of returned) {
    TestValidator.predicate("Only public or B's private")(
      !reply.is_private || reply.customer_id === privateChildB.customer_id,
    );
    // 6e. Not deleted (deleted_at is null)
    TestValidator.equals("not deleted")(reply.deleted_at)(null);
  }
}
