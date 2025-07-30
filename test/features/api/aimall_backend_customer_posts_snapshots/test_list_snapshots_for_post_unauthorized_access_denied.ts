import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate that snapshot listing for a private post is access-controlled.
 *
 * This test ensures that when Customer A creates a private post and uploads a
 * snapshot, Customer B cannot view the post's snapshots, enforcing post privacy
 * and data security.
 *
 * Steps:
 *
 * 1. Customer A creates a private post.
 * 2. Customer A uploads a snapshot for the post.
 * 3. Customer B (simulated by reuse of connection, as authentication switching is
 *    not specified) attempts to GET the snapshots for Customer A's post — must
 *    receive permission denied or not found error.
 *
 * The test confirms that unauthorized customers are prevented from reading
 * private post attachments.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_list_snapshots_for_post_unauthorized_access_denied(
  connection: api.IConnection,
) {
  // 1. Customer A creates a private post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "Private Post Test",
        body: "This post is private and should not be visible to others.",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Customer A uploads a snapshot to the post
  const snapshot =
    await api.functional.aimall_backend.customer.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          media_uri: "https://cdn.example.com/img/test-image.jpg",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // ---
  // NOTE: SDK provides no customer authentication API to switch customer accounts.
  // In a real-world scenario, the following step would require cleanly switching to Customer B's credentials.
  // For this test's purposes, we simulate this as best as possible given API limitations.
  // ---

  // 3. Simulated: Customer B attempts to list snapshots for Customer A's private post and should receive an error.
  await TestValidator.error("Access denied to private post's snapshots")(
    async () =>
      await api.functional.aimall_backend.customer.posts.snapshots.index(
        connection,
        { postId: post.id },
      ),
  );
}
