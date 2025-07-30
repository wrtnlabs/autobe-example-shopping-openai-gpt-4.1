import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Ensures strict validation enforcement for comment creation with invalid or
 * incomplete data.
 *
 * Business context: The API must not allow creation of comments with missing
 * content, empty body, or illegal privacy flag values. All invalid attempts
 * must result in validation errors, and no resource should be created.
 *
 * Steps:
 *
 * 1. Create a valid post (dependency) to enable legitimate comment association for
 *    negative-case testing.
 * 2. Attempt to create a comment with:
 *
 *    - Missing 'body' field
 *    - 'body' field as empty string
 *    - Omitting 'is_private' field
 *    - "Null" for non-nullable fields (body, is_private)
 *    - (Optional) Omitting post and review association to test bare minimum required
 * 3. For all invalid payload attempts, verify the API throws an error (using
 *    TestValidator.error), indicating failed validation.
 * 4. No error message validation required, only that an error is thrown for each
 *    case.
 */
export async function test_api_aimall_backend_customer_comments_test_create_comment_duplicate_or_invalid_input_failure(
  connection: api.IConnection,
) {
  // 1. Create a valid post as a dependency
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Negative Case: Missing 'body' field
  TestValidator.error("missing body must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: post.id,
        is_private: false,
        // body missing
      } as any, // Used for intentional field omission, in implementation only
    }),
  );

  // 3. Negative Case: Empty body string
  TestValidator.error("empty body string must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: post.id,
        body: "",
        is_private: false,
      },
    }),
  );

  // 4. Negative Case: Omitting is_private
  TestValidator.error("missing is_private must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.content()()(),
        // is_private missing
      } as any, // Used for intentional field omission
    }),
  );

  // 5. Negative Case: Null for body
  TestValidator.error("null body must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: post.id,
        body: null,
        is_private: false,
      } as any,
    }),
  );

  // 6. Negative Case: Null for is_private
  TestValidator.error("null is_private must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        post_id: post.id,
        body: RandomGenerator.content()()(),
        is_private: null,
      } as any,
    }),
  );

  // 7. Negative Case: No association to post_id or review_id
  TestValidator.error("missing post_id and review_id must fail")(() =>
    api.functional.aimall_backend.customer.comments.create(connection, {
      body: {
        body: RandomGenerator.content()()(),
        is_private: false,
        // No post_id or review_id
      } as any,
    }),
  );
}
