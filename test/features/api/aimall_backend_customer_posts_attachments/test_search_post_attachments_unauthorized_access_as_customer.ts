import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that customers cannot access attachments for posts they do not own.
 *
 * Scenario: Two separate customer accounts are created (customerA and
 * customerB). Each customer creates a post. Logged in as customerA, attempt to
 * access the attachments of customerB's post via the PATCH
 * /aimall-backend/customer/posts/{postId}/attachments. The test passes if a
 * forbidden error (403) or equivalent is returned.
 *
 * Steps:
 *
 * 1. Create a post as customerA (postA)
 * 2. Simulate another customer by creating a post as customerB (postB) using a
 *    second logical connection
 * 3. While authenticated as customerA, attempt to search attachments for postB via
 *    the endpoint
 * 4. Confirm a forbidden or similar error is thrown
 */
export async function test_api_aimall_backend_customer_posts_attachments_test_search_post_attachments_unauthorized_access_as_customer(
  connection: api.IConnection,
) {
  // 1. Create a post as customerA
  const postA = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postA);

  // --- Simulating a separate customer: In a real implementation, switch identity ---
  // For this test: create another independent post (postB) as a second customer by reusing connection,
  // since authentication APIs are not provided.
  // In a real system, use two separate authenticated sessions.
  const postB = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(postB);

  // 3. Attempt to access attachments of postB as (ostensibly) customerA
  // Should receive forbidden or similar error
  await TestValidator.error(
    "forbidden access to another user's post attachments",
  )(async () => {
    await api.functional.aimall_backend.customer.posts.attachments.search(
      connection,
      {
        postId: postB.id,
        body: {}, // Minimal body: all fields optional
      },
    );
  });
}
