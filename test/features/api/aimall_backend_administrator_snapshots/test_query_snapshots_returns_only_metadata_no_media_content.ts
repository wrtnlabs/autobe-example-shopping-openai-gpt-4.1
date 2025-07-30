import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that fetching the administrator snapshots list returns ONLY metadata
 * and does not expose direct media content.
 *
 * Business objective: The GET /administrator/snapshots endpoint must return a
 * list of media snapshot metadata for admin dashboards, but should NOT leak the
 * direct file/media content (e.g., base64 data, binaries) – only metadata
 * fields such as media_uri, caption, and core associations (post, product,
 * etc.) are allowed. This ensures compliance with privacy, performance, and
 * security best practices.
 *
 * Test steps:
 *
 * 1. Create a parent post as a context for the snapshot (admin role).
 * 2. As admin, upload a media snapshot (with fake URI/caption) to the created
 *    post.
 * 3. Fetch the /administrator/snapshots list.
 * 4. Assert that the new snapshot appears in the list, and that each record
 *    strictly contains only the allowed metadata fields:
 *
 *    - Id, product_id, post_id, customer_id, media_uri, caption, created_at
 *         (matching IAimallBackendSnapshot DTO)
 * 5. Confirm that there are NO fields for file data, base64 blobs, nor other raw
 *    content in the response.
 * 6. Optionally, verify that sensitive associations (e.g., customer_id) respect
 *    privacy (optional/null if not provided).
 *
 * The scenario checks not just the main happy path, but also that the endpoint
 * enforces security by contract regarding exposure of only metadata fields.
 */
export async function test_api_aimall_backend_administrator_snapshots_index_returns_only_metadata_no_media_content(
  connection: api.IConnection,
) {
  // 1. Create a parent post as context for the snapshot
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload a media snapshot to the created post
  const snapshot =
    await api.functional.aimall_backend.administrator.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: `https://cdn.example.com/fake-media/${post.id}.jpg`,
          caption: "admin upload test screenshot",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 3. Fetch the administrator snapshot list
  const list =
    await api.functional.aimall_backend.administrator.snapshots.index(
      connection,
    );
  typia.assert(list);

  // 4. Assert that (at least) our new snapshot appears, with correct allowed metadata fields ONLY
  TestValidator.predicate("snapshot present in response")(
    !!list.data?.find((s) => s.id === snapshot.id),
  );

  for (const meta of list.data ?? []) {
    // 5. Must have only allowed metadata fields (as in IAimallBackendSnapshot), no leaked binary/content fields
    // Using Object.keys to check property set
    const keys = Object.keys(meta).sort();
    TestValidator.equals("metadata fields only")(keys)(
      [
        "id",
        "product_id",
        "post_id",
        "customer_id",
        "media_uri",
        "caption",
        "created_at",
      ].sort(),
    );
    // 6. Sanity check core metadata values
    TestValidator.predicate("media_uri present and non-empty")(
      !!meta.media_uri,
    );
    TestValidator.predicate("created_at present")(!!meta.created_at);
    // Direct media content fields must not exist
    TestValidator.predicate("no base64 media content exposed")(
      !("file_data" in meta || "data" in meta || "binary" in meta),
    );
  }
}
