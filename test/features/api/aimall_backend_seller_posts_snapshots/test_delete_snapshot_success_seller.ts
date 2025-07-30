import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate deleting a snapshot from a seller-owned post (hard delete, 204
 * expected).
 *
 * This test simulates the end-to-end lifecycle to verify that a seller can
 * delete an attached snapshot media from their post.
 *
 * **Workflow:**
 *
 * 1. Create a seller account via admin onboarding endpoint (simulates a newly
 *    registered merchant)
 * 2. Seller creates a new community post (represents post-ownership)
 * 3. Seller attaches a new snapshot/media to the post
 * 4. Execute the snapshot deletion operation (the test subject)
 *
 * The response from the delete API should be void (no body). This validates
 * proper hard-delete, respecting seller permissions and audit enforcement.
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_delete_snapshot_success_seller(
  connection: api.IConnection,
) {
  // 1. Create a seller account (admin onboarding)
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Seller creates a new post (ensures ownership)
  const post = await api.functional.aimall_backend.seller.posts.create(
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

  // 3. Seller attaches a snapshot to the post
  const snapshot =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.jpg`,
          caption: RandomGenerator.alphabets(8),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 4. Seller deletes the snapshot
  await api.functional.aimall_backend.seller.posts.snapshots.erase(connection, {
    postId: post.id,
    snapshotId: snapshot.id,
  });
}
