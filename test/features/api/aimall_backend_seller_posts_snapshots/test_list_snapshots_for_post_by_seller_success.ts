import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validates listing of all snapshots for a seller's community post.
 *
 * This test ensures that after creating a post as a seller and uploading
 * multiple snapshots to it, the seller can retrieve the full list of snapshots
 * via the proper endpoint. Also verifies correct return values (including empty
 * list) depending on if snapshots exist for a post.
 *
 * Steps:
 *
 * 1. Seller creates a new community post
 * 2. Seller uploads multiple snapshots to the post
 * 3. Seller retrieves the list of snapshots for that post and verifies all fields
 *    and count
 * 4. Seller creates a new post without uploading any snapshots, then retrieves its
 *    snapshots and checks that the result is empty
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_list_snapshots_for_post_by_seller_success(
  connection: api.IConnection,
) {
  // 1. Seller creates a new community post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Seller uploads multiple snapshots to the post
  const NUM_SNAPSHOTS = 3;
  const snapshots: IAimallBackendSnapshot[] = [];
  for (let i = 0; i < NUM_SNAPSHOTS; ++i) {
    const snapshot =
      await api.functional.aimall_backend.seller.posts.snapshots.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            media_uri: `https://cdn.example.com/snapshot-${i}.jpg`,
            caption: RandomGenerator.paragraph()(1),
            created_at: new Date().toISOString(),
          } satisfies IAimallBackendSnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }

  // 3. Seller retrieves the list of snapshots for the post
  const page = await api.functional.aimall_backend.seller.posts.snapshots.index(
    connection,
    {
      postId: post.id,
    },
  );
  typia.assert(page);
  TestValidator.equals("snapshot count")((page.data ?? []).length)(
    NUM_SNAPSHOTS,
  );

  // Check that each uploaded snapshot is present and fields match
  for (const uploaded of snapshots) {
    const found = (page.data ?? []).find((item) => item.id === uploaded.id);
    TestValidator.predicate("uploaded snapshot should be in list")(!!found);
    if (found) {
      TestValidator.equals("media_uri")(found.media_uri)(uploaded.media_uri);
      TestValidator.equals("caption")(found.caption)(uploaded.caption);
      TestValidator.equals("post_id")(found.post_id)(uploaded.post_id);
    }
  }

  // 4. Seller creates a new post with no snapshots, checks the empty result
  const emptyPost = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(emptyPost);
  const emptyPage =
    await api.functional.aimall_backend.seller.posts.snapshots.index(
      connection,
      {
        postId: emptyPost.id,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty snapshot array")((emptyPage.data ?? []).length)(
    0,
  );
}
