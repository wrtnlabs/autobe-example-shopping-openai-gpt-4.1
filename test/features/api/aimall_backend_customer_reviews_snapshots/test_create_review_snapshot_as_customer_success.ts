import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test the successful creation of a media snapshot for a product review by a
 * customer.
 *
 * Business context:
 *
 * - Customers can add media snapshots (photos/videos) to their existing product
 *   reviews.
 * - A customer must be registered and a review for a product must exist before a
 *   snapshot can be added to that review.
 *
 * Test steps:
 *
 * 1. Register a new customer with unique email and phone, set as 'active'.
 * 2. (Authentication): There is no explicit login API provided, so assume customer
 *    connection is authenticated after creation.
 * 3. Create a review for a random product as this customer using valid review
 *    fields (product_id, title, body, rating).
 * 4. Create a compliant snapshot (media_uri required, optionally caption, other
 *    fields as needed) for that review via reviewId.
 * 5. Assert that the API returns the persisted snapshot; validate the output type
 *    and that key properties (media_uri, product linkage, customer linkage,
 *    caption) match the input.
 * 6. (GET endpoint validation omitted as there is no such API in provided
 *    materials.)
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_create_review_snapshot_as_customer_success(
  connection: api.IConnection,
) {
  // Step 1: Register a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: null,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // Step 2: Create a review as this customer
  const productId: string = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: productId,
        title: RandomGenerator.paragraph()(),
        body: RandomGenerator.content()()(),
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // Step 3: Create a new media snapshot for the review
  const mediaUri =
    "https://cdn.example.com/photos/" +
    typia.random<string & tags.Format<"uuid">>();
  const caption = RandomGenerator.paragraph()(1);
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          customer_id: customer.id,
          product_id: productId,
          media_uri: mediaUri,
          caption,
          // 'created_at' can be omitted (set by the backend)
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot links to correct product")(
    snapshot.product_id,
  )(productId);
  TestValidator.equals("snapshot links to correct customer")(
    snapshot.customer_id,
  )(customer.id);
  TestValidator.equals("snapshot media_uri matches")(snapshot.media_uri)(
    mediaUri,
  );
  TestValidator.equals("snapshot caption matches")(snapshot.caption)(caption);
}
