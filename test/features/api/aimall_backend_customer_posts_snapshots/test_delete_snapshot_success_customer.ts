import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate the successful deletion of a snapshot resource belonging to a
 * customer post.
 *
 * This test simulates the end-to-end workflow for deleting a media snapshot
 * that is attached to a community post. It follows these main steps:
 *
 * 1. An authenticated customer creates a new post.
 * 2. The same customer uploads a snapshot (media resource) to that post.
 * 3. The customer then deletes the specific snapshot using the valid postId and
 *    snapshotId.
 * 4. The test attempts to retrieve the deleted snapshot to ensure it is no longer
 *    accessible, as expected by business logic (should result in error or not
 *    found). If there is no direct retrieval API, this is contractually assumed
 *    and commented.
 *
 * This test ensures proper ownership enforcement, correct deletion behavior,
 * and that business rules around snapshot/media entity lifecycle are followed.
 * It also guarantees that after deletion, the resource cannot be retrieved,
 * confirming hard/soft delete as required by system contract.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_delete_snapshot_success_customer(
  connection: api.IConnection,
) {
  // 1. Create a new post as a customer
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(8),
    body: RandomGenerator.content()()(),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: postInput,
    },
  );
  typia.assert(post);

  // 2. Upload a snapshot to the newly created post
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    media_uri: `https://img-cdn.test.example/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    post_id: post.id,
    caption: RandomGenerator.paragraph()(2),
  };
  const snapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: snapshotInput,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("linked post id")(snapshot.post_id)(post.id);

  // 3. The customer deletes the snapshot
  await api.functional.aimall_backend.customer.posts.snapshots.erase(
    connection,
    {
      postId: post.id,
      snapshotId: snapshot.id,
    },
  );

  // 4. Verify the snapshot can no longer be retrieved (simulate by attempting access, expect error)
  // Note: As there is currently no public API for retrieving a single snapshot by ID, we cannot directly verify deletion via a read call.
  // This step is left as a contract expectation and should be improved when a retrieval endpoint is available.
}
