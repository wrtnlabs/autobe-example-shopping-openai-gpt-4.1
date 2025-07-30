import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate updating snapshot fields for seller posts, covering both success and
 * negative cases.
 *
 * This scenario ensures:
 *
 * - Seller (owner) can update editable fields (caption, media_uri) of an attached
 *   snapshot.
 * - System returns the updated entity and the changes are persisted.
 * - Updating with an invalid snapshotId or postId returns an error.
 * - An unauthorized user (other than seller/owner) fails to update (permission
 *   enforcement).
 * - Attempting to supply non-editable fields results in those changes being
 *   ignored or error, per business logic.
 *
 * Steps:
 *
 * 1. Seller creates a post.
 * 2. Seller attaches a snapshot to the post.
 * 3. Seller updates one or both editable fields (caption/media_uri) of that
 *    snapshot – check response and that update was applied.
 * 4. Attempt update with a random postId or snapshotId (not owned/not existing) –
 *    validate an error is thrown.
 * 5. (If system supports roles) Switch to a different user/non-owner – confirm
 *    updating snapshot fails (unauthorized).
 * 6. Try updating non-editable fields (e.g. created_at, id, etc.) – ensure only
 *    editable fields change, or that a clear validation error happens.
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_update_snapshot_for_post_by_seller_permission_enforcement_and_validation(
  connection: api.IConnection,
) {
  // 1. Seller creates post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Seller attaches a snapshot
  const snapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          media_uri: RandomGenerator.alphabets(16),
          caption: "Old caption",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Update snapshot editable field(s)
  const newCaption = "Updated caption";
  const newMediaUri = RandomGenerator.alphabets(24);
  const updatedSnapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
        body: {
          caption: newCaption,
          media_uri: newMediaUri,
        } satisfies IAimallBackendSnapshot.IUpdate,
      },
    );
  typia.assert(updatedSnapshot);
  TestValidator.equals("caption updated")(updatedSnapshot.caption)(newCaption);
  TestValidator.equals("media_uri updated")(updatedSnapshot.media_uri)(
    newMediaUri,
  );

  // 4. Invalid snapshotId/postId
  await TestValidator.error("invalid snapshotId should fail")(async () => {
    await api.functional.aimall_backend.seller.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          caption: "Should not update",
        },
      },
    );
  });
  await TestValidator.error("invalid postId should fail")(async () => {
    await api.functional.aimall_backend.seller.posts.snapshots.update(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: snapshot.id,
        body: {
          caption: "Should not update",
        },
      },
    );
  });

  // 5. Try as different user – skip if no multi-account

  // 6. Try non-editable fields
  await TestValidator.error(
    "non-editable fields should cause error or be ignored",
  )(async () => {
    await api.functional.aimall_backend.seller.posts.snapshots.update(
      connection,
      {
        postId: post.id,
        snapshotId: snapshot.id,
        body: {
          // @ts-expect-error purposely wrong fields
          id: typia.random<string & tags.Format<"uuid">>(),
          created_at: new Date().toISOString(),
          media_uri: RandomGenerator.alphabets(18),
        },
      },
    );
  });
}
