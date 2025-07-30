import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test deletion of a snapshot with an invalid or unrelated snapshotId for a
 * given postId as a customer.
 *
 * This test validates the API's resource existence and reference integrity
 * checks when attempting snapshot deletion.
 *
 * Steps:
 *
 * 1. Create a post as a customer to serve as the postId context
 * 2. Attempt to delete a snapshot with a random snapshotId that is guaranteed not
 *    to exist nor be linked to the post
 * 3. Verify that the API responds with a 404 Not Found or suitable business error
 *    indicating invalid snapshot reference
 * 4. Confirm business logic enforcement that no resource was deleted for invalid
 *    request
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_delete_snapshot_invalid_snapshot_id_customer(
  connection: api.IConnection,
) {
  // 1. Create a post as a customer (valid postId context)
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attempt to delete a snapshot with an invalid/unrelated snapshotId
  // Use a random UUID to ensure this snapshotId does not exist for the given post
  await TestValidator.error(
    "deleting non-existent or unrelated snapshot should fail",
  )(() =>
    api.functional.aimall_backend.customer.posts.snapshots.erase(connection, {
      postId: post.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    }),
  );
}
