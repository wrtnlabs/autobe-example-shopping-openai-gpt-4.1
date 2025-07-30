import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that a seller cannot search attachments on a post they do not own.
 *
 * This test verifies that seller access is correctly restricted for attachment
 * search: if one seller attempts to search (PATCH) attachments for a post
 * belonging to another seller, the API must reject with a forbidden (403)
 * error.
 *
 * Steps:
 *
 * 1. Create a post (postA) as the current seller.
 * 2. Create a second post (postB) that would belong to another seller (not
 *    enforceable with current public API).
 * 3. Attempt to search attachments on postB while authenticated as the initial
 *    seller, expecting a forbidden error.
 *
 * Note: Because seller/account differentiation is not possible with the
 * provided API/SDK, both posts will actually be owned by the same identity. The
 * business intent is shown, but true cross-account enforcement cannot be tested
 * with available functions.
 */
export async function test_api_aimall_backend_seller_posts_attachments_test_search_post_attachments_as_seller_on_post_they_do_not_own(
  connection: api.IConnection,
) {
  // Step 1: Create postA
  const postA = await api.functional.aimall_backend.seller.posts.create(
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

  // Step 2: Create postB (intended to be by a different seller, but indistinguishable under current SDK)
  const postB = await api.functional.aimall_backend.seller.posts.create(
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

  // Step 3: Attempt forbidden attachment search
  await TestValidator.error(
    "should forbid searching attachments on another seller's post",
  )(() =>
    api.functional.aimall_backend.seller.posts.attachments.search(connection, {
      postId: postB.id,
      body: {}, // minimal valid search filter
    }),
  );
}
