import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that creating a comment fails with proper errors when the input
 * violates schema or business rules.
 *
 * Ensures that the API correctly rejects invalid comment creation attempts on
 * posts:
 *
 * - If required fields are missing ('body' or 'is_private')
 * - If comment 'body' is empty or unacceptably short
 * - If 'is_private' is of an invalid type (string instead of boolean)
 *
 * This test confirms the API enforces input validation and provides appropriate
 * error responses for all such cases.
 *
 * Steps:
 *
 * 1. Prepare a valid post to comment on, using /aimall-backend/customer/posts
 * 2. Attempt to create a comment with missing 'body' (should fail)
 * 3. Attempt to create a comment with missing 'is_private' (should fail)
 * 4. Attempt to create a comment with an empty body (should fail)
 * 5. Attempt to create a comment with a too-short body (should fail)
 * 6. Attempt to create a comment with invalid type for 'is_private' (should fail)
 */
export async function test_api_aimall_backend_customer_posts_comments_test_customer_create_comment_input_validation_errors(
  connection: api.IConnection,
) {
  // 1. Prepare a post as a target for the invalid comment creation attempts
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(1),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // Helper: Construct invalid objects at runtime to bypass TypeScript type system for error scenario testing
  const makeInvalid = (obj: object): any => JSON.parse(JSON.stringify(obj));

  // 2. Missing 'body' field
  await TestValidator.error("should reject when 'body' is missing")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: makeInvalid({
            is_private: false,
          }),
        },
      );
    },
  );

  // 3. Missing 'is_private' field
  await TestValidator.error("should reject when 'is_private' is missing")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: makeInvalid({
            body: "This comment has no is_private flag.",
          }),
        },
      );
    },
  );

  // 4. Empty 'body' field
  await TestValidator.error("should reject when 'body' is empty")(async () => {
    await api.functional.aimall_backend.customer.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "",
          is_private: false,
        },
      },
    );
  });
  // 5. Too-short 'body' field (if business rule exists)
  await TestValidator.error("should reject when 'body' is too short")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: "a",
            is_private: false,
          },
        },
      );
    },
  );

  // 6. Invalid type for 'is_private'
  await TestValidator.error("should reject when 'is_private' is not a boolean")(
    async () => {
      await api.functional.aimall_backend.customer.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: makeInvalid({
            body: "Valid body but privacy flag is string",
            is_private: "true",
          }),
        },
      );
    },
  );
}
