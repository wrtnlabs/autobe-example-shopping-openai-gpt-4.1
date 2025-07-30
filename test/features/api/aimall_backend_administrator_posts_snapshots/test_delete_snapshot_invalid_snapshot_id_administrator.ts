import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test deletion attempt by an administrator with an invalid snapshotId
 * (nonexistent or not related to the postId).
 *
 * This test ensures that destructive operations like snapshot deletions are
 * robustly validated:
 *
 * 1. Create an administrator post (dependency).
 * 2. Attempt to delete a snapshot from the post using a random (nonexistent)
 *    snapshotId that does not belong to the post.
 * 3. Confirm that an error is thrown (indicating not found or relationship
 *    validation), demonstrating protective validations before deletion.
 * 4. Repeat the deletion with another random snapshotId to ensure consistency.
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_delete_snapshot_invalid_snapshot_id_administrator(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()(2)(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attempt to delete a snapshot with a random snapshotId that doesn't exist
  await TestValidator.error(
    "deleting snapshot with invalid snapshotId should throw error",
  )(async () => {
    await api.functional.aimall_backend.administrator.posts.snapshots.erase(
      connection,
      {
        postId: post.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });

  // 3. Attempt again with another random snapshotId
  await TestValidator.error(
    "deleting snapshot with another invalid snapshotId should throw error",
  )(async () => {
    await api.functional.aimall_backend.administrator.posts.snapshots.erase(
      connection,
      {
        postId: post.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
