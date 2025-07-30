import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validates error response and system behavior when attempting to delete an
 * already soft-deleted community post as an administrator.
 *
 * Business rationale: Only original authors or administrators may perform a
 * soft delete (sets the deleted_at timestamp). Once a post is soft deleted,
 * repeated deletion requests should result in a specific error and the DB/state
 * must remain unchanged for data integrity and audit compliance.
 *
 * Testing steps (setup and execution):
 *
 * 1. Create a new post as a customer (serves as test subject).
 * 2. As administrator, soft-delete the post via admin endpoint.
 * 3. Attempt to soft-delete the same post again as administrator.
 * 4. Confirm an error is returned indicating already-deleted record.
 * 5. Confirm the post remains soft-deleted (deleted_at remains set, not reset).
 *
 * (Optional auditing verification - if endpoint provided) 6. Check audit log
 * for proper error entry (skipped unless API exposed).
 */
export async function test_api_aimall_backend_administrator_posts_test_admin_delete_already_deleted_post_error(
  connection: api.IConnection,
) {
  // 1. Create a customer post (setup)
  const createdPost = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(5),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // 2. Soft delete the post as admin
  await api.functional.aimall_backend.administrator.posts.erase(connection, {
    postId: createdPost.id,
  });

  // 3. Attempt to soft delete again (should error)
  await TestValidator.error("Deleting already deleted post must error")(
    async () => {
      await api.functional.aimall_backend.administrator.posts.erase(
        connection,
        {
          postId: createdPost.id,
        },
      );
    },
  );

  // 4. (Optional) Reconfirm post state if readable (skipped, no get endpoint present)
  // If an admin GET endpoint existed, could re-query and confirm deleted_at is unchanged.
}
