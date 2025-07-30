import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate that a seller can successfully create a post using valid data.
 *
 * Business context: This test ensures that a seller account is able to create
 * community posts (e.g., announcements, Q&A) with all required fields supplied.
 * It verifies that the created post is properly attributed, stored, and
 * includes the correct author type (i.e., as a seller, not a customer). The
 * test further confirms that the returned entity contains all relevant
 * information after creation, and the post can be referenced for management or
 * listing like any other post.
 *
 * Step-by-step process:
 *
 * 1. Prepare valid data for a seller post (title, body, is_private).
 * 2. Call the API to create the post as a seller.
 * 3. Assert that the returned entity matches the structure, values, and includes
 *    seller attribution.
 * 4. Optionally (if available), assert that the post can be retrieved in a
 *    subsequent listing or detail view. (SKIP if only create API is present.)
 */
export async function test_api_aimall_backend_seller_posts_test_create_post_as_seller_with_valid_information(
  connection: api.IConnection,
) {
  // 1. Prepare seller post data
  const postData: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(3),
    body: RandomGenerator.content()(2)(),
    is_private: false,
  };

  // 2. Seller creates the post
  const created: IAimallBackendPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: postData,
    });
  typia.assert(created);

  // 3. Assert that returned entity matches request data and is attributed to seller
  TestValidator.equals("title matches")(created.title)(postData.title);
  TestValidator.equals("body matches")(created.body)(postData.body);
  TestValidator.equals("is_private matches")(created.is_private)(
    postData.is_private,
  );
  TestValidator.predicate("seller post does not belong to customer")(
    created.customer_id === null || created.customer_id === undefined,
  );
  TestValidator.predicate("post was given an id")(
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.predicate("post has view_count")(
    typeof created.view_count === "number",
  );
  TestValidator.predicate("post has created_at")(
    typeof created.created_at === "string",
  );
  TestValidator.predicate("post has updated_at")(
    typeof created.updated_at === "string",
  );
}
