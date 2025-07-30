import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate API input type enforcement for seller post creation.
 *
 * This test checks that the backend strictly enforces input type validation
 * when creating a seller post. It attempts to create a post with deliberately
 * invalid types for required fields (such as using an integer for `title` and a
 * string for `is_private`).
 *
 * The API is expected to reject such requests with a validation error rather
 * than creating a post record, ensuring that only strictly-typed data is
 * accepted into the system.
 *
 * Steps:
 *
 * 1. Prepare an invalid post body where `title` is an integer (should be string),
 *    and `is_private` is a string (should be boolean).
 * 2. Attempt to create the post as a seller using the invalid payload.
 * 3. Assert that a validation error is thrown and no post is created.
 */
export async function test_api_aimall_backend_seller_posts_test_create_post_fails_for_invalid_data_type(
  connection: api.IConnection,
) {
  // 1. Prepare invalid post data
  const invalidPost = {
    title: 12345, // invalid type (should be string)
    body: "Some body content", // valid
    is_private: "not-a-boolean", // invalid type (should be boolean)
  };

  // 2. Try to create post, expect a validation (type) error
  await TestValidator.error("invalid type for required fields")(async () => {
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: invalidPost as any, // must force as 'any' to bypass compile-time type for runtime error test
    });
  });
}
