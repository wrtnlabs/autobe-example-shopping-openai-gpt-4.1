import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Test attempting to create a comment as a seller on a community post with
 * missing required fields.
 *
 * Business Context: Sellers are allowed to create comments on community posts
 * through the seller API. Input validation is enforced, so missing required
 * fields (such as 'body') in the comment creation request should result in a
 * validation error. It is important that the test only checks business-rule
 * validation errors that are possible at runtime, since omitting a required
 * field from an object in TypeScript is a compile-time type error and cannot be
 * tested directly. This test therefore omits only what is legally possible at
 * runtime (e.g., passing empty string, null for nullable property, etc).
 *
 * Steps:
 *
 * 1. Create a post as a seller (dependency – required to get a valid postId for
 *    commenting)
 * 2. Attempt to create a comment on that post with body as an empty string to
 *    simulate missing content (the closest possible invalid scenario in a
 *    type-safe way)
 * 3. Assert that API returns a validation error
 * 4. Confirm error handling – verify failure and absence of newly created comment
 */
export async function test_api_aimall_backend_seller_posts_comments_test_create_comment_on_post_as_seller_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create a seller post to comment on
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Attempt to create a comment with an empty body (simulates "missing" field as much as is possible in type-safe code)
  await TestValidator.error("should fail due to empty comment body")(
    async () => {
      await api.functional.aimall_backend.seller.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: "", // Invalid: required but empty
            is_private: false,
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    },
  );
}
