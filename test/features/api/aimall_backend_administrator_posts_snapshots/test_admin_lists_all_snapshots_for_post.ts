import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that an administrator can list all snapshots for both public and
 * private community posts.
 *
 * This test ensures administrators have full visibility into all snapshot
 * records associated with posts, regardless of the post privacy setting. The
 * workflow covers both public and private post creation, snapshot uploads, and
 * verification via the administrator listing endpoint.
 *
 * 1. Create a public post as a customer.
 * 2. Create a private post as a customer.
 * 3. Upload a snapshot linked to each post (public and private).
 * 4. As administrator, list snapshots for each post using the administrator
 *    endpoint.
 * 5. Validate that all snapshot records (for both public and private posts) are
 *    returned and conform to the schema.
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_index(
  connection: api.IConnection,
) {
  // 1. Create a public post as customer
  const publicPost = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(12),
        body: RandomGenerator.content()(5)(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(publicPost);

  // 2. Create a private post as customer
  const privatePost = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(8),
        body: RandomGenerator.content()(3)(),
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(privatePost);

  // 3. Upload a snapshot to the public post
  const publicSnapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: publicPost.id,
        body: {
          post_id: publicPost.id,
          media_uri: "https://cdn.example.com/snapshot1.jpg",
          caption: "Public post snapshot",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(publicSnapshot);

  // 4. Upload a snapshot to the private post
  const privateSnapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: privatePost.id,
        body: {
          post_id: privatePost.id,
          media_uri: "https://cdn.example.com/snapshot2.jpg",
          caption: "Private post snapshot",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(privateSnapshot);

  // 5. As administrator, list snapshots for the public post
  const adminPublicList =
    await api.functional.aimall_backend.administrator.posts.snapshots.index(
      connection,
      {
        postId: publicPost.id,
      },
    );
  typia.assert(adminPublicList);
  TestValidator.predicate(
    "admin receives at least the uploaded public snapshot",
  )((adminPublicList.data ?? []).some((s) => s.id === publicSnapshot.id));

  // 6. As administrator, list snapshots for the private post
  const adminPrivateList =
    await api.functional.aimall_backend.administrator.posts.snapshots.index(
      connection,
      {
        postId: privatePost.id,
      },
    );
  typia.assert(adminPrivateList);
  TestValidator.predicate(
    "admin receives at least the uploaded private snapshot",
  )((adminPrivateList.data ?? []).some((s) => s.id === privateSnapshot.id));
}
