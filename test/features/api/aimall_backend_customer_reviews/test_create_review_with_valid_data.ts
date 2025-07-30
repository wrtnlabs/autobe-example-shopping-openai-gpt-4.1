import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test successful creation of a new product review as a customer.
 *
 * Business purpose:
 *
 * - Validates that a customer can submit a review with required fields and that
 *   the review is associated with their identity and a product.
 * - Ensures the system enforces required atomic fields and populates audit
 *   fields.
 *
 * Steps:
 *
 * 1. Select a product UUID (simulate existence – either fixed test UUID or random
 *    for isolation).
 * 2. Use the provided connection context (assumed to represent an authenticated
 *    customer session).
 * 3. Provide all required fields for IAimallBackendReview.ICreate: product_id,
 *    title, body, rating in [1,5].
 * 4. Invoke the create API for reviews via
 *    api.functional.aimall_backend.customer.reviews.create.
 * 5. Assert that all provided fields are echoed in response, audit fields are
 *    populated, the review is associated with the correct product and no soft
 *    deletion is present.
 */
export async function test_api_aimall_backend_customer_reviews_test_create_review_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Select (simulate) a product UUID
  const product_id = typia.random<string & tags.Format<"uuid">>();

  // 2. Use the connection as an authenticated customer context

  // 3. Prepare a valid review input
  const input: IAimallBackendReview.ICreate = {
    product_id,
    title: "Outstanding Product!",
    body: "Really impressed by the quality and fast delivery.",
    rating: 5,
  };

  // 4. Create the review
  const result = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: input,
    },
  );
  typia.assert(result);

  // 5. Business validation: All fields present, correct ownership and atomicity
  TestValidator.equals("product_id echoed")(result.product_id)(
    input.product_id,
  );
  TestValidator.equals("title echoed")(result.title)(input.title);
  TestValidator.equals("body echoed")(result.body)(input.body);
  TestValidator.equals("rating echoed")(result.rating)(input.rating);
  TestValidator.predicate("customer_id is a nonempty string")(
    typeof result.customer_id === "string" && result.customer_id.length > 0,
  );
  TestValidator.predicate("created_at present")(!!result.created_at);
  TestValidator.predicate("updated_at present")(!!result.updated_at);
  TestValidator.equals("not soft-deleted")(result.deleted_at)(null);
}
