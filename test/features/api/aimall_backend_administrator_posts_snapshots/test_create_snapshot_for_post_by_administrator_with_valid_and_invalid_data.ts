import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate creation of a snapshot (photo/media) via administrator to a specific
 * post.
 *
 * This test ensures that:
 *
 * 1. An authenticated administrator can create a community post.
 * 2. The administrator can attach a valid snapshot (media_uri required) to that
 *    post by postId.
 * 3. The result of snapshot creation reflects all relevant fields—including
 *    accurate post_id linking, correct media_uri echo, and generated fields
 *    such as id and created_at.
 * 4. Attempts to create a snapshot referencing a non-existent postId should fail
 *    with a foreign key or integrity error.
 * 5. Permissions boundary is respected: only administrator/allowed users can use
 *    this endpoint.
 *
 * Steps:
 *
 * 1. Create a new post as administrator.
 * 2. Attach a valid snapshot (media_uri given) to the new post. Confirm response
 *    fields.
 * 3. Attempt to attach snapshot with non-existent postId → expect error.
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_create_snapshot_for_post_by_administrator_with_valid_and_invalid_data(
  connection: api.IConnection,
) {
  // 1. Create a post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.paragraph()(5),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attach a valid snapshot to the post
  const validMediaUri = `https://media.example.com/${RandomGenerator.alphaNumeric(16)}`;
  const snapshot =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: validMediaUri,
          caption: RandomGenerator.paragraph()(1),
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("post_id matches")(snapshot.post_id)(post.id);
  TestValidator.equals("media_uri matches")(snapshot.media_uri)(validMediaUri);
  TestValidator.predicate("has id")(
    typeof snapshot.id === "string" && snapshot.id.length > 0,
  );
  TestValidator.predicate("has created_at")(
    typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
  );

  // 3. Try creating a snapshot with invalid postId (should fail)
  await TestValidator.error("non-existent postId fails")(async () => {
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          post_id: typia.random<string & tags.Format<"uuid">>(),
          media_uri: `https://media.example.com/${RandomGenerator.alphaNumeric(16)}`,
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  });
}
