import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Test updating a community post with invalid payloads to ensure the API
 * performs data validation and does not allow invalid updates.
 *
 * This test covers updating an existing post by:
 *
 * 1. Creating a new post as the test subject.
 * 2. Attempting to update with an excessively long title (simulate possible max
 *    length violation).
 * 3. Attempting to update with a missing required field (null body, to test
 *    nullability/emptiness handling).
 * 4. Attempting to update with an invalid privacy value (e.g., set is_private to
 *    null if schema does not allow it).
 * 5. Verifying that each attempt returns an error or is rejected, and that the
 *    post remains unchanged after each invalid operation.
 *
 * Business Rules Validated:
 *
 * - Title length limit enforced
 * - Required fields (e.g., body content) enforced
 * - Is_private boolean value validated
 * - Invalid update attempts do not modify the post
 *
 * Note: Audit log check is skipped if there is no API access for audit logging.
 */
export async function test_api_aimall_backend_seller_posts_test_update_post_with_invalid_parameters_failure(
  connection: api.IConnection,
) {
  // 1. Create a new valid post
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Valid Title",
        body: "Valid post body.",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(post);

  // 2. Save original post for later comparison
  const originalPost = { ...post };

  // 3. Try to update with excessively long title
  await TestValidator.error("should fail for excessively long title")(
    async () => {
      await api.functional.aimall_backend.seller.posts.update(connection, {
        postId: post.id,
        body: {
          title: "A".repeat(300), // assuming UI/API limit < 300 chars
        } satisfies IAimallBackendPost.IUpdate,
      });
    },
  );

  // 4. Try to update with missing required body (set to null)
  await TestValidator.error("should fail for missing body")(async () => {
    await api.functional.aimall_backend.seller.posts.update(connection, {
      postId: post.id,
      body: {
        body: null, // nullable, but expect required
      } satisfies IAimallBackendPost.IUpdate,
    });
  });

  // 5. Try to update with invalid is_private (set to null)
  await TestValidator.error("should fail for invalid is_private")(async () => {
    await api.functional.aimall_backend.seller.posts.update(connection, {
      postId: post.id,
      body: {
        is_private: null,
      } satisfies IAimallBackendPost.IUpdate,
    });
  });

  // 6. Confirm the post was not changed after failed updates
  const current = await api.functional.aimall_backend.seller.posts.update(
    connection,
    {
      postId: post.id,
      body: {},
    },
  );
  typia.assert(current);
  TestValidator.equals("post should remain unchanged")(current)({
    ...originalPost,
  });
}
