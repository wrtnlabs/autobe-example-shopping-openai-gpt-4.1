import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate error handling when attempting to add a reply to a restricted parent
 * comment (e.g., soft-deleted/locked thread).
 *
 * Business requirement: users should not be able to add replies under parent
 * comments that are not open for replies (for reasons such as thread lock,
 * moderation, or soft deletion).
 *
 * This test simulates a scenario where a parent comment is first created, then
 * soft-deleted, and finally a reply attempt is made under the deleted parent
 * comment. The expected outcome is that the API throws a business logic error
 * indicating that replies cannot be added to closed threads.
 *
 * Steps:
 *
 * 1. Create a parent comment.
 * 2. Soft delete (logically delete) the parent comment (which should set
 *    deleted_at and block replies).
 * 3. Attempt to create a reply as a child comment under the deleted parent
 *    comment.
 * 4. Verify that the reply creation is rejected with an error
 *    (TestValidator.error).
 */
export async function test_api_aimall_backend_customer_comments_test_create_reply_to_closed_thread_fails(
  connection: api.IConnection,
) {
  // 1. Create a parent comment
  const parentComment =
    await api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
        post_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IAimallBackendComment.ICreate,
    });
  typia.assert(parentComment);

  // 2. Soft delete the parent comment (simulate thread lock/restricted)
  await api.functional.aimall_backend.customer.comments.erase(connection, {
    commentId: parentComment.id,
  });

  // 3. Attempt to add a reply under the soft-deleted parent comment (should fail)
  await TestValidator.error("replying under deleted/locked parent should fail")(
    async () => {
      await api.functional.aimall_backend.customer.comments.comments.create(
        connection,
        {
          commentId: parentComment.id,
          body: {
            body: RandomGenerator.paragraph()(),
            is_private: false,
            parent_id: parentComment.id,
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    },
  );
}
