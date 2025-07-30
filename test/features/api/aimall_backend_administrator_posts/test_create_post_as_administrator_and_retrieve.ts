import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate admin post creation and retrieval workflow.
 *
 * This test confirms that an administrator can successfully create a post with
 * all administrator-permitted fields, and that the resulting post can be
 * retrieved via the standard post detail endpoint with correct admin
 * attribution. The workflow ensures that admin-specific post creation logic
 * functions correctly, and regular fetch flows can retrieve posts regardless of
 * author (admin or customer).
 *
 * Steps:
 *
 * 1. Create a post using the admin endpoint
 *    (`/aimall-backend/administrator/posts`) with a full set of fields accepted
 *    for admin (including optional `customer_id` as null, and all
 *    booleans/strings).
 * 2. Assert the returned object contains all expected fields, with admin-specific
 *    attribution (`customer_id` null or omitted).
 * 3. Fetch the created post using the get-by-id endpoint
 *    (`/aimall-backend/posts/{postId}`) to ensure that admin-created posts are
 *    retrievable through the normal public API.
 * 4. Assert the returned post matches the original response, and properly reflects
 *    admin origin (such as `customer_id` being null or missing).
 */
export async function test_api_aimall_backend_administrator_posts_test_create_post_as_administrator_and_retrieve(
  connection: api.IConnection,
) {
  // 1. Create a new post as administrator
  const createInput: IAimallBackendPost.ICreate = {
    customer_id: null,
    title: RandomGenerator.paragraph()(2),
    body: RandomGenerator.content()(2)(3),
    is_private: false,
  };
  const created: IAimallBackendPost =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 2. Check admin attribution (customer_id null for admin)
  TestValidator.equals("admin post has null customer_id")(created.customer_id)(
    null,
  );
  TestValidator.equals("title matches")(created.title)(createInput.title);
  TestValidator.equals("body matches")(created.body)(createInput.body);
  TestValidator.equals("is_private matches")(created.is_private)(
    createInput.is_private,
  );
  TestValidator.equals("view_count initializes to 0")(created.view_count)(0);
  TestValidator.predicate("created_at exists and is ISO8601 string")(
    typeof created.created_at === "string" && created.created_at.length > 0,
  );
  TestValidator.predicate("updated_at exists and is ISO8601 string")(
    typeof created.updated_at === "string" && created.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at should be null or undefined for new post")(
    created.deleted_at ?? null,
  )(null);

  // 3. Retrieve the post by id from standard endpoint
  const fetched: IAimallBackendPost =
    await api.functional.aimall_backend.posts.at(connection, {
      postId: created.id,
    });
  typia.assert(fetched);

  // 4. Assert retrieved matches created, especially admin attribution and unchanged fields
  TestValidator.equals("id matches")(fetched.id)(created.id);
  TestValidator.equals("title matches")(fetched.title)(created.title);
  TestValidator.equals("body matches")(fetched.body)(created.body);
  TestValidator.equals("is_private matches")(fetched.is_private)(
    created.is_private,
  );
  TestValidator.equals("view_count matches")(fetched.view_count)(
    created.view_count,
  );
  TestValidator.equals("customer_id null for admin-created")(
    fetched.customer_id,
  )(null);
  TestValidator.equals("deleted_at should be null or undefined for admin post")(
    fetched.deleted_at ?? null,
  )(null);
}
