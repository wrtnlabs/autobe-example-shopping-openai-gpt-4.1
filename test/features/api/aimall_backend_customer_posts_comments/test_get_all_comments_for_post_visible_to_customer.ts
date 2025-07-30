import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate retrieval of all comments for a post visible to a customer.
 *
 * This test verifies that when a customer requests all comments for a given
 * post:
 *
 * - They see all public comments,
 * - They see their own private comments,
 * - They do NOT see private comments authored by other users.
 *
 * Steps:
 *
 * 1. Create a post as CustomerA (assume authenticated connection is CustomerA)
 * 2. CustomerA leaves a public comment and a private comment
 * 3. Simulate a second user CustomerB by swapping in a new customer connection,
 *    and have CustomerB leave both a public and a private comment
 * 4. Fetch all comments for the post as CustomerA
 * 5. Assert the result contains:
 *
 *    - All public comments
 *    - CustomerA's private comment
 *    - No private comments from CustomerB
 * 6. Verify pagination metadata is present
 */
export async function test_api_aimall_backend_customer_posts_comments_get_all_visible_to_customer(
  connection: api.IConnection,
  connectionB: api.IConnection,
) {
  // 1. CustomerA creates a post.
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(3),
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. CustomerA leaves public and private comments
  const commentA_pub =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Visible to everyone!",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(commentA_pub);
  const commentA_priv =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "My private thoughts",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(commentA_priv);

  // 3. CustomerB (using connectionB) leaves public and private comments
  const commentB_pub =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connectionB,
      {
        postId: post.id,
        body: {
          body: "Greetings from B (public)",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(commentB_pub);
  const commentB_priv =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connectionB,
      {
        postId: post.id,
        body: {
          body: "B's private secret",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(commentB_priv);

  // 4. Fetch all comments for the post as CustomerA
  const output =
    await api.functional.aimall_backend.customer.posts.comments.index(
      connection,
      { postId: post.id },
    );
  typia.assert(output);

  // 5. Assert visible comments: all public + CustomerA's private, NOT CustomerB's private
  const expectedVisible = [commentA_pub, commentB_pub, commentA_priv];
  for (const expected of expectedVisible) {
    TestValidator.predicate("expected comment is visible")(
      output.data.some((c) => c.id === expected.id),
    );
  }
  TestValidator.predicate("other user's private comment not visible")(
    !output.data.some((c) => c.id === commentB_priv.id),
  );

  // 6. Pagination metadata is present
  TestValidator.predicate("pagination present")(
    typeof output.pagination === "object",
  );
}
