import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate updating a snapshot attached to a post as administrator, including
 * runtime error and validation testing.
 *
 * 1. Create a post as admin and obtain its postId.
 * 2. Attach a snapshot to the post and obtain its snapshotId.
 * 3. Update the snapshot (caption and media_uri) using the update endpoint.
 *
 *    - Verify that the response shows the updated values and has the same id.
 * 4. Attempt to update using an invalid postId or snapshotId – confirm a runtime
 *    (404) error is thrown.
 * 5. Attempt to update the snapshot with missing required fields (empty body) and
 *    invalid/malformed values (e.g., both caption and media_uri omitted, or
 *    media_uri=null), and verify that a validation error is triggered.
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_update_snapshot_for_post_by_administrator_and_handling_of_invalid_data(
  connection: api.IConnection,
) {
  // 1. Create a new post as admin
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attach a snapshot with a valid media_uri to the post
  const snapshot =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: "https://cdn.example.com/test-image-original.jpg",
          caption: "Initial caption",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Update the snapshot's caption and media_uri
  const updatedCaption = "Updated caption";
  const updatedMediaUri = "https://cdn.example.com/test-image-edited.jpg";
  const updated =
    await api.functional.aimall_backend.administrator.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
        body: {
          caption: updatedCaption,
          media_uri: updatedMediaUri,
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("updated caption")(updated.caption)(updatedCaption);
  TestValidator.equals("updated media_uri")(updated.media_uri)(updatedMediaUri);
  TestValidator.equals("snapshot id unchanged")(updated.id)(snapshot.id);
  TestValidator.equals("post_id unchanged")(updated.post_id)(snapshot.post_id);

  // 4. Try to update with an invalid postId/snapshotId – expect runtime error (404)
  await TestValidator.error("update with non-existent postId")(() =>
    api.functional.aimall_backend.administrator.posts.snapshots.update(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: snapshot.id,
        body: {
          caption: "Dummy",
        },
      },
    ),
  );
  await TestValidator.error("update with non-existent snapshotId")(() =>
    api.functional.aimall_backend.administrator.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          caption: "Dummy",
        },
      },
    ),
  );

  // 5. Try invalid body (both fields omitted) - expect validation failure
  await TestValidator.error("both fields omitted triggers validation error")(
    () =>
      api.functional.aimall_backend.administrator.posts.snapshots.update(
        connection,
        {
          postId: post.id,
          snapshotId: snapshot.id,
          body: {},
        },
      ),
  );

  // 6. Try invalid body (media_uri explicitly null) - expect validation failure
  await TestValidator.error("media_uri=null triggers validation error")(() =>
    api.functional.aimall_backend.administrator.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
        body: { media_uri: null as any },
      },
    ),
  );
}
