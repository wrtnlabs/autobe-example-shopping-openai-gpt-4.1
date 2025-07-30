import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate public/active community post detail retrieval.
 *
 * This test covers the workflow where a user (customer role) creates a
 * community post (not private), then retrieves its details as would be done by
 * an end user or visitor. It verifies all required atomic fields, confirms no
 * private/deleted fields are returned, and ensures detailed business and type
 * correctness.
 *
 * Steps:
 *
 * 1. Create a non-private (is_private: false) community post using POST
 *    /aimall-backend/customer/posts
 * 2. Retrieve the post details by its id using GET /aimall-backend/posts/{postId}
 * 3. Assert that all expected atomic fields are present and match the creation
 *    data
 * 4. Confirm that no deleted fields (deleted_at) are set
 * 5. Confirm that the privacy field is set correctly (is_private === false)
 */
export async function test_api_aimall_backend_posts_test_retrieve_post_detail_success_existing_public_post(
  connection: api.IConnection,
) {
  // 1. Create a non-private post
  const creationInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    is_private: false,
  };
  const created: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: creationInput,
    });
  typia.assert(created);

  // 2. Retrieve post detail by id
  const detail: IAimallBackendPost =
    await api.functional.aimall_backend.posts.at(connection, {
      postId: created.id,
    });
  typia.assert(detail);

  // 3. Assert fields match: atomic properties, privacy, and that no deleted_at exists
  TestValidator.equals("id")(detail.id)(created.id);
  TestValidator.equals("title")(detail.title)(creationInput.title);
  TestValidator.equals("body")(detail.body)(creationInput.body);
  TestValidator.equals("is_private")(detail.is_private)(false);
  TestValidator.equals("view_count is present and int32")(
    typeof detail.view_count === "number" &&
      Number.isInteger(detail.view_count),
  )(true);

  // 4. Confirm deleted_at is null or undefined (undeleted)
  TestValidator.predicate("no deleted_at")(detail.deleted_at == null);

  // 5. Field presence/absence validation
  TestValidator.predicate("all expected atomic fields present")(
    "id" in detail &&
      "title" in detail &&
      "body" in detail &&
      "is_private" in detail &&
      "view_count" in detail &&
      "created_at" in detail &&
      "updated_at" in detail,
  );
}
