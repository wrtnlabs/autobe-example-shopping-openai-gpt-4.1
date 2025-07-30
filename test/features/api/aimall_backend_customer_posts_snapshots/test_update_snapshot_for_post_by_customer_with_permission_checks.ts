import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate update of an existing media snapshot attached to a community post by
 * the owning customer, including permission enforcement.
 *
 * Workflow:
 *
 * 1. Register/login as a customer (assumed to be authenticated via connection).
 * 2. Create a post and obtain the postId (using
 *    api.functional.aimall_backend.customer.posts.create).
 * 3. Attach a snapshot to the post and obtain the snapshotId (using
 *    api.functional.aimall_backend.customer.posts.snapshots.create).
 * 4. Update the snapshot
 *    (api.functional.aimall_backend.customer.posts.snapshots.update) with new
 *    caption/media_uri and verify that changes are reflected in returned
 *    object.
 * 5. Negative: Try to update the snapshot using a non-existent postId/snapshotId
 *    (should fail).
 * 6. Negative: Try to update a snapshot as a different customer, expecting a
 *    permission error.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_update_snapshot_for_post_by_customer_with_permission_checks(
  connection: api.IConnection,
) {
  // 1. Create a post as the customer
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()(2)(2),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postInput },
  );
  typia.assert(post);

  // 2. Attach a snapshot to the post
  const snapshotInput: IAimallBackendSnapshot.ICreate = {
    post_id: post.id,
    media_uri: `https://cdn.example.com/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
    caption: "original caption",
    // created_at omitted for server default
  };
  const snapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      { postId: post.id, body: snapshotInput },
    );
  typia.assert(snapshot);

  // 3. Update the snapshot's caption and media_uri
  const newMediaUri = `https://cdn.example.com/${typia.random<string & tags.Format<"uuid">>()}.jpg`;
  const newCaption = "updated caption";
  const updateInput: IAimallBackendSnapshot.IUpdate = {
    media_uri: newMediaUri,
    caption: newCaption,
  };
  const updated =
    await api.functional.aimall_backend.customer.posts.snapshots.update(
      connection,
      { postId: post.id, snapshotId: snapshot.id, body: updateInput },
    );
  typia.assert(updated);
  TestValidator.equals("media_uri updated")(updated.media_uri)(newMediaUri);
  TestValidator.equals("caption updated")(updated.caption)(newCaption);

  // 4. Negative: Invalid postId
  await TestValidator.error("invalid postId should fail update")(async () => {
    await api.functional.aimall_backend.customer.posts.snapshots.update(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: snapshot.id,
        body: updateInput,
      },
    );
  });

  // 5. Negative: Invalid snapshotId
  await TestValidator.error("invalid snapshotId should fail update")(
    async () => {
      await api.functional.aimall_backend.customer.posts.snapshots.update(
        connection,
        {
          postId: post.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          body: updateInput,
        },
      );
    },
  );

  // 6. Negative: Attempt as other customer (simulate by changing connection)
  const altConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${typia.random<string & tags.Format<"uuid">>()}`,
    },
  };
  await TestValidator.error("another customer cannot update snapshot")(
    async () => {
      await api.functional.aimall_backend.customer.posts.snapshots.update(
        altConnection,
        {
          postId: post.id,
          snapshotId: snapshot.id,
          body: updateInput,
        },
      );
    },
  );
}
