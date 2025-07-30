import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate snapshot detail retrieval access for customer posts.
 *
 * This test ensures a customer can fetch details for snapshots attached to a
 * post only if permitted. Steps:
 *
 * 1. Register two dummy customer accounts (simulate by switching connections if no
 *    dedicated endpoint).
 * 2. As Customer A, create a post (call /aimall-backend/customer/posts POST) and
 *    attach two snapshots (one public, one private; the privacy relies on the
 *    post's is_private).
 * 3. Attempt to fetch snapshot details
 *    (/aimall-backend/customer/posts/{postId}/snapshots/{snapshotId} GET): a)
 *    As Customer A (the post owner/uploader, authenticated): both snapshots
 *    should be accessible b) As Customer B: only the public snapshot should be
 *    retrievable, the private should fail (forbidden or not found) c) As
 *    unauthenticated: only the public one retrievable, private should fail
 * 4. All snapshots should be properly linked to the post and structured correctly.
 *    Assert permission errors for unauthorized retrievals.
 * 5. All IAimallBackendSnapshot fields must validate with typia.assert.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_get_post_snapshot_detail_as_customer_with_valid_and_invalid_permissions(
  connection: api.IConnection,
) {
  // 1. Simulate Customer A: create a public and private post
  const postPublic = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postPublic);

  const postPrivate = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(2),
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postPrivate);

  // 2. Customer A attaches a snapshot to each post
  const snapshotPublic =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: postPublic.id,
        body: {
          media_uri: RandomGenerator.alphaNumeric(32),
          caption: "public snapshot",
          post_id: postPublic.id,
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshotPublic);

  const snapshotPrivate =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: postPrivate.id,
        body: {
          media_uri: RandomGenerator.alphaNumeric(32),
          caption: "private snapshot",
          post_id: postPrivate.id,
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshotPrivate);

  // 3.a. As Customer A: both snapshots are accessible
  for (const { post, snapshot, caption } of [
    { post: postPublic, snapshot: snapshotPublic, caption: "public" },
    { post: postPrivate, snapshot: snapshotPrivate, caption: "private" },
  ]) {
    const res = await api.functional.aimall_backend.customer.posts.snapshots.at(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
      },
    );
    typia.assert(res);
    TestValidator.equals(`${caption} snapshot id`)(res.id)(snapshot.id);
    TestValidator.equals(`${caption} snapshot links to correct post`)(
      res.post_id,
    )(post.id);
  }

  // 3.b/3.c. Simulate access as another customer and as unauthenticated
  // Since no registration/auth APIs exist: Create a new connection (simulate B/anon)
  // For the new connection, only the public snapshot should be accessible
  // (the private should be forbidden/not found)
  const connection2 = { ...connection, headers: {} }; // simulate different user/no auth

  // Public snapshot access is allowed
  const resPublic =
    await api.functional.aimall_backend.customer.posts.snapshots.at(
      connection2,
      {
        postId: postPublic.id,
        snapshotId: snapshotPublic.id,
      },
    );
  typia.assert(resPublic);
  TestValidator.equals("public snapshot id for 2nd user")(resPublic.id)(
    snapshotPublic.id,
  );
  TestValidator.equals("public snapshot links to post for 2nd user")(
    resPublic.post_id,
  )(postPublic.id);

  // Private snapshot access should be forbidden or not found (error)
  await TestValidator.error("private snapshot not visible to other user")(
    async () => {
      await api.functional.aimall_backend.customer.posts.snapshots.at(
        connection2,
        {
          postId: postPrivate.id,
          snapshotId: snapshotPrivate.id,
        },
      );
    },
  );
}
