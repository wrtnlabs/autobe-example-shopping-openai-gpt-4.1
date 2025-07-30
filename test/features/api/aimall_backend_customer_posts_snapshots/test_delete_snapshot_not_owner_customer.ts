import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Ensure that a customer cannot delete a snapshot from a post they do not own.
 *
 * This test simulates an attempt to violate post/snapshot ownership boundaries.
 * Steps:
 *
 * 1. Customer A creates a post.
 * 2. Customer A uploads a snapshot to the created post.
 * 3. Customer B registers (simulated by creating a second post as a different
 *    customer context).
 * 4. Customer B attempts to delete Customer A's snapshot from the post (should
 *    fail with forbidden/unauthorized error).
 * 5. (Read-back confirmation of snapshot is omitted, as no API for this is
 *    available.)
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_delete_snapshot_not_owner_customer(
  connection: api.IConnection,
) {
  // 1. Customer A creates a post
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

  // 2. Customer A uploads a snapshot
  const snapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: RandomGenerator.alphabets(24),
          caption: RandomGenerator.paragraph()(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Register/obtain a second customer (simulated by context switch: creating new post)
  // (This assumes API creates/assigns session/user context per post, due to lack of explicit user APIs)
  await api.functional.aimall_backend.customer.posts.create(connection, {
    body: {
      title: RandomGenerator.paragraph()(),
      body: RandomGenerator.content()()(),
      is_private: false,
    } satisfies IAimallBackendPost.ICreate,
  });

  // 4. Customer B attempts to delete the snapshot from Customer A's post (should fail)
  await TestValidator.error("Non-owner cannot delete snapshot")(async () => {
    await api.functional.aimall_backend.customer.posts.snapshots.erase(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
      },
    );
  });
  // 5. Read-back confirmation skipped as snapshot query API not provided
}
