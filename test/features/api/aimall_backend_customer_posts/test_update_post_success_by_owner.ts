import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate successful update of a community post by its owner (customer)
 *
 * This test verifies that an authenticated customer (the post owner) can update
 * mutable fields of their post using the
 * /aimall-backend/customer/posts/{postId} endpoint. The workflow is as
 * follows:
 *
 * 1. Create a new post as an authenticated customer, capturing the output for
 *    postId and audit fields.
 * 2. Update the post's mutable fields (title and body) via the update API, using
 *    the correct postId.
 *
 *    - Do not include immutable or restricted fields (view_count, created_at,
 *         customer_id, etc.) in the update request.
 * 3. Validate that the returned post record reflects the updated fields, and that
 *    updated_at is modified.
 * 4. Confirm that immutable fields (e.g., customer_id, created_at, view_count)
 *    remain unchanged after the update.
 *
 * Mutable fields: title, body, is_private Immutable/restricted fields: id,
 * customer_id, created_at, updated_at, view_count, deleted_at
 */
export async function test_api_aimall_backend_customer_posts_test_update_post_success_by_owner(
  connection: api.IConnection,
) {
  // 1. Create a post as authenticated customer
  const createInput: IAimallBackendPost.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(),
    is_private: Math.random() < 0.5,
  };
  const created: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 2. Update the post's mutable fields
  const updateInput: IAimallBackendPost.IUpdate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(),
    is_private: !created.is_private,
  };
  const updated: IAimallBackendPost =
    await api.functional.aimall_backend.customer.posts.update(connection, {
      postId: created.id,
      body: updateInput,
    });
  typia.assert(updated);

  // 3. Assert updated fields have changed
  TestValidator.equals("updated title")(updated.title)(updateInput.title);
  TestValidator.equals("updated body")(updated.body)(updateInput.body);
  TestValidator.equals("updated is_private")(updated.is_private)(
    updateInput.is_private,
  );

  // 4. Assert immutable fields remain unchanged
  TestValidator.equals("id unchanged")(updated.id)(created.id);
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    created.customer_id,
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    created.created_at,
  );
  TestValidator.equals("view_count unchanged")(updated.view_count)(
    created.view_count,
  );
  TestValidator.equals("deleted_at unchanged")(updated.deleted_at)(
    created.deleted_at,
  );

  // 5. Assert updated_at is more recent
  TestValidator.predicate("updated_at is newer")(
    new Date(updated.updated_at) > new Date(created.updated_at),
  );
}
