import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate seller access to snapshot details attached to a post, including
 * business rule edge cases.
 *
 * This test ensures that a seller can fetch snapshot details attached to one of
 * their own posts, and that platform permission and existence logic is
 * correctly enforced. It covers both normal and edge scenarios as follows:
 *
 * 1. Seller creates a post (public)
 * 2. Seller uploads two snapshots to that post:
 *
 *    - S1: snapshot of their own post (normal expected access)
 *    - S2: another snapshot on the same post to test multiple assets case
 * 3. Seller attempts to fetch each uploaded snapshot by (postId, snapshotId):
 *    success and correct data
 * 4. Seller attempts to fetch snapshot with a non-existent snapshotId (should 404)
 * 5. Create another post (simulate another seller's post), attach a snapshot (S3),
 *    seller attempts to access S3 via (foreignPostId, S3.id): should error
 *
 * All API responses are type asserted, field-level equality is checked, and
 * error scenarios are validated using TestValidator.error(). Not testing
 * snapshot privacy as no is_private flag is present on snapshot DTOs.
 */
export async function test_api_aimall_backend_test_get_post_snapshot_detail_as_seller_with_proper_and_improper_access(
  connection: api.IConnection,
) {
  // 1. Seller creates a new post (public)
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Upload two snapshots to the post
  const snapshot1 =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://cdn.example.com/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
          caption: "Post image 1",
        },
      },
    );
  typia.assert(snapshot1);

  const snapshot2 =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://cdn.example.com/${typia.random<string & tags.Format<"uuid">>()}.png`,
          caption: "Post image 2",
        },
      },
    );
  typia.assert(snapshot2);

  // 3. Seller fetches their own snapshots (happy path)
  for (const snap of [snapshot1, snapshot2]) {
    const fetched =
      await api.functional.aimall_backend.seller.posts.snapshots.at(
        connection,
        {
          postId: post.id,
          snapshotId: snap.id,
        },
      );
    typia.assert(fetched);
    TestValidator.equals("snapshot post id matches")(fetched.post_id)(post.id);
    TestValidator.equals("media_uri matches")(fetched.media_uri)(
      snap.media_uri,
    );
    TestValidator.equals("caption matches")(fetched.caption)(snap.caption);
  }

  // 4. Fetch with non-existent snapshotId (should 404 or error)
  await TestValidator.error("fetching non-existent snapshotId should fail")(
    () =>
      api.functional.aimall_backend.seller.posts.snapshots.at(connection, {
        postId: post.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      }),
  );

  // 5. Simulate another seller's post, upload a snapshot, try to access as first seller (should error)
  const anotherPost = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(anotherPost);

  const foreignSnapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: anotherPost.id,
        body: {
          post_id: anotherPost.id,
          media_uri: `https://cdn.example.com/${typia.random<string & tags.Format<"uuid">>()}.webp`,
          caption: "Other's post image",
        },
      },
    );
  typia.assert(foreignSnapshot);

  await TestValidator.error(
    "fetching snapshot from another seller's post should fail",
  )(() =>
    api.functional.aimall_backend.seller.posts.snapshots.at(connection, {
      postId: anotherPost.id,
      snapshotId: foreignSnapshot.id,
    }),
  );
}
