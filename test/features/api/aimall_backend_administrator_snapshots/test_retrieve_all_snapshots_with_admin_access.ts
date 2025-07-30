import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate administrative visibility of all community snapshots via list
 * endpoint.
 *
 * Ensures that an administrator can view all community snapshot (media) records
 * through the admin snapshots listing API. This test does the following:
 *
 * 1. Creates a new post as administrator.
 * 2. Uploads a new snapshot (e.g. image/media) attached to the created post.
 * 3. Retrieves all community snapshots as administrator.
 * 4. Confirms the created snapshot is present in the returned snapshot list, and
 *    key fields such as association, media URI, and caption are correct.
 *
 * Steps:
 *
 * 1. Create a community post using the administrator API.
 * 2. Upload a snapshot linked to the created post, including a media_uri and
 *    caption.
 * 3. Call GET /administrator/snapshots to retrieve all snapshots.
 * 4. Search for the created snapshot in the result list.
 * 5. If found, verify the linked post_id, media_uri, caption, and the existence of
 *    the created_at timestamp.
 */
export async function test_api_aimall_backend_administrator_snapshots_test_retrieve_all_snapshots_with_admin_access(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Upload a snapshot linked to the post
  const snapshot =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://files.example.com/${post.id}/image.jpg`,
          caption: RandomGenerator.paragraph()(),
        },
      },
    );
  typia.assert(snapshot);

  // 3. Retrieve all community snapshots as administrator
  const res =
    await api.functional.aimall_backend.administrator.snapshots.index(
      connection,
    );
  typia.assert(res);

  // 4. Confirm the created snapshot appears in the result list and audit key fields
  const found = (res.data ?? []).find((s) => s.id === snapshot.id);
  TestValidator.predicate("snapshot must appear in admin list")(!!found);
  if (found) {
    TestValidator.equals("linked post id matches")(found.post_id)(post.id);
    TestValidator.equals("media_uri matches")(found.media_uri)(
      snapshot.media_uri,
    );
    TestValidator.equals("caption matches")(found.caption)(snapshot.caption);
    TestValidator.predicate("created_at exists")(!!found.created_at);
  }
}
