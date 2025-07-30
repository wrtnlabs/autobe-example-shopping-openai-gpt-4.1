import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate that forbidden and invalid fields in post update fail gracefully.
 *
 * This test checks the update endpoint for community posts in the customer
 * role. It ensures that attempts to update system-managed fields (such as id or
 * created_at), or passing the wrong data type to editable fields, are strictly
 * rejected by the backend, with no partial or silent updates allowed.
 *
 * Steps:
 *
 * 1. Create a new post as preparation.
 * 2. Attempt to update the post with invalid types for editable fields (e.g.,
 *    boolean for title, string for is_private).
 * 3. Confirm that the API returns a validation error in each case (using
 *    TestValidator.error).
 *
 * Note: Cannot test illegal system fields (id, created_at) directly, as
 * TypeScript and the DTO schema prevent their inclusion. Also, can't
 * re-validate data integrity after failure since no GET endpoint is provided in
 * current SDK. Only runtime type and validation errors for updatable fields are
 * checked.
 */
export async function test_api_aimall_backend_customer_posts_test_update_post_with_invalid_fields_returns_error(
  connection: api.IConnection,
) {
  // 1. Create a new post
  const createInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_private: false,
  };
  const post: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: createInput,
    });
  typia.assert(post);

  // 2. Attempt update with invalid type for "title" (should be string | null, provide boolean)
  await TestValidator.error("update with title as boolean should fail")(() =>
    api.functional.aimall_backend.customer.posts.update(connection, {
      postId: post.id,
      body: { title: true as unknown as string },
    }),
  );

  // 3. Attempt update with invalid type for "is_private" (should be boolean | null, provide string)
  await TestValidator.error("update with is_private as string should fail")(
    () =>
      api.functional.aimall_backend.customer.posts.update(connection, {
        postId: post.id,
        body: { is_private: "yes" as unknown as boolean },
      }),
  );
  // Cannot confirm data was unchanged as there's no GET/read endpoint available in SDK; see doc comment for details.
}
