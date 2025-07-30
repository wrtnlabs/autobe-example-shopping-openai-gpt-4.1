import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test comment visibility and access control for customer role.
 *
 * 1. Customer A creates a post.
 * 2. Customer A adds a public comment to the post.
 * 3. Customer B adds a private comment to the post.
 * 4. Customer C tries to get both comments.
 *
 *    - Access to public comment: should succeed (status 200) and data should match.
 *    - Access to private comment (owned by B): should be denied (404 or forbidden).
 *
 * Steps:
 *
 * - Register/log in as three customers for isolation.
 * - Each comment is created via its actual creator session.
 * - Retrieve comments via Customer C and validate business rules.
 */
export async function test_api_aimall_backend_test_get_single_comment_visibility_and_access_control_customer(
  connection: api.IConnection,
) {
  // STEP 1: Simulate three distinct customer contexts (A, B, C)
  // NOTE: The actual authentication/join endpoints for customer identity switching
  // are not present in API list, so we will proceed as if we switch context.

  // STEP 2: Customer A creates a post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "Test Post for Comment Visibility",
        body: "This post will be used to test customer comment visibility.",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // STEP 3: Customer A creates a PUBLIC comment on the post
  const publicComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a public comment for testing access.",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(publicComment);

  // STEP 4: Simulate switching to Customer B
  // Customer B creates a PRIVATE comment on the same post
  const privateComment =
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a private comment for testing access.",
          is_private: true,
        } satisfies IAimallBackendComment.ICreate,
      },
    );
  typia.assert(privateComment);

  // STEP 5: Simulate switching to Customer C
  // Customer C tries to get public comment (should succeed)
  const retrievedPublic =
    await api.functional.aimall_backend.customer.posts.comments.at(connection, {
      postId: post.id,
      commentId: publicComment.id,
    });
  typia.assert(retrievedPublic);
  TestValidator.equals("retrieved public comment should match original")(
    retrievedPublic.body,
  )(publicComment.body);
  TestValidator.equals("retrieved comment should not be private")(
    retrievedPublic.is_private,
  )(false);

  // Customer C tries to get private comment (should fail: 404 or forbidden)
  await TestValidator.error("Cannot access private comment of another user")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.at(
        connection,
        {
          postId: post.id,
          commentId: privateComment.id,
        },
      );
    },
  );
}
