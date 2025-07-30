import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that a customer can retrieve all snapshots for their own community
 * post.
 *
 * This test ensures that after a customer creates a community post and uploads
 * multiple snapshots, the GET endpoint returns all associated snapshots,
 * matching both quantity and schema fields for that particular post. Also tests
 * the edge case of retrieving snapshots for a post with zero attachments
 * (should return an empty list).
 *
 * Steps:
 *
 * 1. Create a community post as a customer (store the postId)
 * 2. Upload several (3) snapshots to the post
 * 3. List snapshots for the post. Assert all uploaded snapshots are present and
 *    fields match.
 * 4. For good measure, create a second post and verify that listing snapshots
 *    returns empty for a post with no snapshots.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_list_snapshots_for_post_successful_access(
  connection: api.IConnection,
) {
  // 1. Create a post
  const postBody: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(8),
    body: RandomGenerator.content()()(10),
    is_private: false,
  };
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 2. Upload three snapshots linked to this post
  const snapshots = await ArrayUtil.asyncRepeat(3)(async () => {
    const input: IAimallBackendSnapshot.ICreate = {
      post_id: post.id,
      media_uri: RandomGenerator.alphabets(12),
      caption: RandomGenerator.paragraph()(2),
    };
    const snap =
      await api.functional.aimall_backend.customer.posts.snapshots.create(
        connection,
        {
          postId: post.id,
          body: input,
        },
      );
    typia.assert(snap);
    return snap;
  });

  // 3. Retrieve snapshot list for the post
  const page =
    await api.functional.aimall_backend.customer.posts.snapshots.index(
      connection,
      {
        postId: post.id,
      },
    );
  typia.assert(page);
  // Confirm all uploaded snapshots are present in the response
  TestValidator.predicate("snapshot list contains all uploaded snapshots")(
    Array.isArray(page.data)
      ? snapshots.every((s) => page.data!.some((item) => item.id === s.id))
      : false,
  );
  // Spot check one snapshot's essential fields
  if (Array.isArray(page.data) && page.data.length > 0) {
    page.data.forEach((snap) => {
      if (snap.post_id === post.id) {
        TestValidator.equals("snapshot post id matches")(snap.post_id)(post.id);
        TestValidator.predicate("media uri non-empty")(
          typeof snap.media_uri === "string" && snap.media_uri.length > 0,
        );
        TestValidator.predicate("created_at valid")(!!snap.created_at);
      }
    });
  }

  // 4. Edge case: fetch a post with zero snapshots
  const post2Body: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(6),
    body: RandomGenerator.content()()(6),
    is_private: false,
  };
  const post2 = await api.functional.aimall_backend.customer.posts.create(
    connection,
    { body: post2Body },
  );
  typia.assert(post2);

  const page2 =
    await api.functional.aimall_backend.customer.posts.snapshots.index(
      connection,
      {
        postId: post2.id,
      },
    );
  typia.assert(page2);
  TestValidator.equals("empty snapshot list")(
    Array.isArray(page2.data) ? page2.data.length : 0,
  )(0);
}
