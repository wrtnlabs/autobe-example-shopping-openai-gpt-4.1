import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Verify that an administrator can update community posts regardless of the
 * original author.
 *
 * This test ensures that an administrator has the privilege to modify any post.
 *
 * Steps:
 *
 * 1. Create a new post as a seller user (simulating a non-admin actor).
 * 2. Update the post as an administrator, modifying the title, body, and toggling
 *    the is_private field.
 * 3. Confirm all changes are accepted and reflected in the response.
 */
export async function test_api_aimall_backend_administrator_posts_test_admin_update_any_post_success(
  connection: api.IConnection,
) {
  // Step 1: Create a community post as a seller user (simulate non-admin creation)
  const originalTitle = RandomGenerator.alphaNumeric(8);
  const originalBody = RandomGenerator.paragraph()();
  const originalIsPrivate = false;
  const createdPost: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: originalTitle,
        body: originalBody,
        is_private: originalIsPrivate,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(createdPost);

  // Step 2: Update the post as an administrator — change all updatable fields
  const updatedTitle = originalTitle + "_ADMIN_UPDATE";
  const updatedBody = originalBody + "\nUpdated by Admin.";
  const updatedIsPrivate = !originalIsPrivate;
  const updatedPost: IAimallBackendPost =
    await api.functional.aimall_backend.administrator.posts.update(connection, {
      postId: createdPost.id,
      body: {
        title: updatedTitle,
        body: updatedBody,
        is_private: updatedIsPrivate,
      } satisfies IAimallBackendPost.IUpdate,
    });
  typia.assert(updatedPost);

  // Step 3: Validate that all updated fields are reflected in the response
  TestValidator.equals("title updated")(updatedPost.title)(updatedTitle);
  TestValidator.equals("body updated")(updatedPost.body)(updatedBody);
  TestValidator.equals("privacy toggled")(updatedPost.is_private)(
    updatedIsPrivate,
  );
}
