import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validate fetching detailed review information by the owning customer.
 *
 * This test simulates the scenario where a customer creates a product review
 * and then attempts to retrieve its full detail as the same user. It ensures:
 *
 * - The review detail API returns all fields (title, body, rating, product_id,
 *   customer_id, created_at, updated_at) accurately, matching the creation
 *   payload.
 * - The review is active (deleted_at is null or absent).
 * - No unauthorized fields are present in the response.
 * - Proper access control: the review owner sees all details.
 *
 * Steps:
 *
 * 1. Generate a valid payload to create a new review (using a random product_id,
 *    title, body, and rating).
 * 2. Submit the review as the customer and obtain the created reviewId.
 * 3. As the same customer, request the review details by reviewId.
 * 4. Assert all required fields are present and match values from creation.
 * 5. Check deleted_at is null or not present (active record).
 * 6. Ensure response does not include unauthorized fields.
 * 7. Confirm access control logic provides full info for the record owner.
 */
export async function test_api_aimall_backend_customer_reviews_test_get_review_detail_as_customer_with_valid_review(
  connection: api.IConnection,
) {
  // 1. Generate a valid review payload for creation
  const createInput: IAimallBackendReview.ICreate = {
    product_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    body: RandomGenerator.content()()(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  };

  // 2. Submit the review, extracting reviewId for later fetch
  const created: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: createInput,
    });
  typia.assert(created);

  // 3. Fetch review details by reviewId as the record's owner
  const detailed: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.at(connection, {
      reviewId: created.id,
    });
  typia.assert(detailed);

  // 4. Validate field values are accurate
  TestValidator.equals("title matches")(detailed.title)(createInput.title);
  TestValidator.equals("body matches")(detailed.body)(createInput.body);
  TestValidator.equals("rating matches")(detailed.rating)(createInput.rating);
  TestValidator.equals("product_id matches")(detailed.product_id)(
    createInput.product_id,
  );
  TestValidator.equals("customer_id matches")(detailed.customer_id)(
    created.customer_id,
  );
  TestValidator.predicate("created_at is string")(
    typeof detailed.created_at === "string",
  );
  TestValidator.predicate("updated_at is string")(
    typeof detailed.updated_at === "string",
  );

  // 5. Confirm review is active (not soft-deleted)
  TestValidator.equals("deleted_at is null or undefined")(
    detailed.deleted_at ?? null,
  )(null);

  // 6. Check response only contains allowed fields
  const allowedKeys = [
    "id",
    "customer_id",
    "product_id",
    "title",
    "body",
    "rating",
    "created_at",
    "updated_at",
    "deleted_at",
  ];
  for (const key of Object.keys(detailed)) {
    if (!allowedKeys.includes(key))
      throw new Error(`Unauthorized field found on detailed review: ${key}`);
  }

  // 7. Access control: as review owner, all data should be visible (checked above)
}
