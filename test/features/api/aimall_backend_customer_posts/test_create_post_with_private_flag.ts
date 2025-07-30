import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate private community post creation and privacy field enforcement.
 *
 * This test checks that when a customer creates a post with the `is_private`
 * flag set to true:
 *
 * - The post is created and associated with the correct customer.
 * - The privacy flag is correctly set on the created post.
 * - (Limits): Cannot verify privacy enforcement for unauthorized/public users, as
 *   there are no read APIs provided in the current SDK/materials.
 *
 * Steps implemented:
 *
 * 1. Create a new post with `is_private: true` as an authenticated customer.
 * 2. Assert the post is created, has the correct fields, and `is_private` is true.
 * 3. (SKIP) Test for privacy enforcement from unauthorized users—NOT implementable
 *    due to lack of read APIs.
 */
export async function test_api_aimall_backend_customer_posts_test_create_post_with_private_flag(
  connection: api.IConnection,
) {
  // 1. Create a private post as an authenticated customer
  const postInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(2),
    body: RandomGenerator.content()()(),
    is_private: true,
  };
  const created: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: postInput,
    });
  typia.assert(created);
  TestValidator.equals("private flag")(created.is_private)(true);
  TestValidator.predicate("customer id exists")(
    typeof created.customer_id === "string" && created.customer_id.length > 0,
  );
  TestValidator.equals("title matches")(created.title)(postInput.title);
  TestValidator.equals("body matches")(created.body)(postInput.body);

  // 2. (If accessible) Would attempt to verify privacy enforcement by unauthorized users,
  // but no GET/read accessors exist in available SDK/API. Skipping this validation.
}
