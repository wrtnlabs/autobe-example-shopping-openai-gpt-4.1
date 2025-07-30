import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validates that administrators can fetch the detail of any snapshot across all
 * posts (private or public). Also ensures edge/error cases return appropriate
 * errors for invalid IDs.
 *
 * Workflow:
 *
 * 1. Create multiple posts (some public, some private)
 * 2. For each post, create several snapshots.
 *
 *    - Ensure variety: at least one with only media_uri, one with caption, random
 *         created_at
 * 3. For each snapshot, as administrator, retrieve details and verify all
 *    properties
 * 4. Attempt to retrieve a snapshot with an invalid/non-existent snapshotId or
 *    postId, assert error occurs
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_administrator_can_fetch_any_post_snapshot_detail_and_handle_invalid_cases(
  connection: api.IConnection,
) {
  // 1. Create two posts: one public, one private
  const postPublic =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: {
        title: "Public post for snapshot test",
        body: "This is the public test post.",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(postPublic);

  const postPrivate =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: {
        title: "Private post for snapshot test",
        body: "This is the private test post.",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(postPrivate);

  // 2. Upload snapshots to each post (public and private)
  const snapshotPublic =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: postPublic.id,
        body: {
          media_uri: "https://example.com/media_public.jpg",
          caption: "Caption for public snapshot",
          created_at: new Date().toISOString(),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshotPublic);

  const snapshotPrivate =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: postPrivate.id,
        body: {
          media_uri: "https://example.com/media_private.jpg",
          caption: "Caption for private snapshot",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshotPrivate);

  // 3. Retrieve each snapshot as administrator and assert full detail
  for (const [post, snapshot] of [
    [postPublic, snapshotPublic],
    [postPrivate, snapshotPrivate],
  ] as const) {
    const detail =
      await api.functional.aimall_backend.administrator.posts.snapshots.at(
        connection,
        {
          postId: post.id,
          snapshotId: snapshot.id,
        },
      );
    typia.assert(detail);
    TestValidator.equals("snapshot ID matches")(detail.id)(snapshot.id);
    TestValidator.equals("post ID matches")(detail.post_id)(post.id);
    TestValidator.equals("media_uri matches")(detail.media_uri)(
      snapshot.media_uri,
    );
    if (snapshot.caption !== undefined)
      TestValidator.equals("caption matches")(detail.caption)(snapshot.caption);
  }

  // 4. Attempt access with invalid snapshotId, expect error
  const invalidUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("non-existent snapshotId")(() =>
    api.functional.aimall_backend.administrator.posts.snapshots.at(connection, {
      postId: postPublic.id,
      snapshotId: invalidUUID,
    }),
  );

  // 5. Attempt access with invalid postId, expect error
  await TestValidator.error("non-existent postId")(() =>
    api.functional.aimall_backend.administrator.posts.snapshots.at(connection, {
      postId: invalidUUID,
      snapshotId: snapshotPublic.id,
    }),
  );
}
