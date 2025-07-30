import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate that an administrator can update atomic fields on any product review
 * (title, body, rating), and that immutable fields cannot be changed.
 *
 * Business context: This test verifies that an administrator has override
 * privileges and can modify user reviews’ title, body, or rating on behalf of
 * moderation/audit needs, without altering immutable record fields such as
 * product_id and customer_id. The process guarantees record integrity and
 * tracks changes by updated_at, following audit/compliance demands.
 *
 * Steps:
 *
 * 1. Create a new product review as a customer using the customer reviews API
 * 2. As the admin, update the review’s title, body, and rating using the admin
 *    review update API
 * 3. Validate that:
 *
 *    - The mutable fields (title, body, rating) are changed as requested
 *    - The immutable fields (product_id, customer_id) remain unchanged
 *    - The created_at field is unchanged
 *    - The updated_at timestamp is newer (greater) than before
 *    - The deleted_at field remains null (not soft-deleted)
 */
export async function test_api_aimall_backend_administrator_reviews_test_admin_update_review_atomic_fields(
  connection: api.IConnection,
) {
  // 1. Create the review as a customer
  const createInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Initial review title",
    body: "Initial review body content.",
    rating: 5,
  };
  const original: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: createInput,
    });
  typia.assert(original);

  // 2. As admin, update review fields (change title, body, and rating)
  const updateInput: IAimallBackendReview.IUpdate = {
    title: "[ADMIN] Title updated by admin",
    body: "[ADMIN] Content edited by admin.",
    rating: 3,
  };
  const updated: IAimallBackendReview =
    await api.functional.aimall_backend.administrator.reviews.update(
      connection,
      {
        reviewId: original.id,
        body: updateInput,
      },
    );
  typia.assert(updated);

  // 3. Confirm mutable fields changed, immutable ones fixed
  TestValidator.equals("title updated by admin")(updated.title)(
    updateInput.title,
  );
  TestValidator.equals("body updated by admin")(updated.body)(updateInput.body);
  TestValidator.equals("rating updated by admin")(updated.rating)(
    updateInput.rating,
  );
  TestValidator.equals("product_id unchanged")(updated.product_id)(
    original.product_id,
  );
  TestValidator.equals("customer_id unchanged")(updated.customer_id)(
    original.customer_id,
  );
  TestValidator.equals("created_at unchanged")(updated.created_at)(
    original.created_at,
  );
  TestValidator.equals("deleted_at remains null")(updated.deleted_at)(null);

  // 4. updated_at must be newer than original
  TestValidator.predicate("updated_at timestamp newer")(
    new Date(updated.updated_at).getTime() >
      new Date(original.updated_at).getTime(),
  );
}
