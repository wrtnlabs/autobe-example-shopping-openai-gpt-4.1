import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Validate updating a review's snapshot metadata by the owning customer.
 *
 * This test ensures that a customer, as the owner of both the review and the
 * associated snapshot, can successfully update the metadata for that snapshot.
 * The main focus is to verify that changes to fields like the caption or the
 * media URI are saved. The process starts with registering a customer, then
 * creating a review, adding a snapshot, and then updating the snapshot. After
 * the update, the test must confirm that the changes have been applied
 * correctly (e.g., the new caption or URI are reflected in the result).
 *
 * Steps:
 *
 * 1. Register a new customer account (who will author both review and snapshot)
 * 2. Create a new product review by this customer
 * 3. Add a media snapshot to this review
 * 4. Update the snapshot metadata (caption and/or media_uri) as the owner
 * 5. Validate the update took effect (fields changed, ownership preserved)
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_update_review_snapshot_successful_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a new customer for authoring review and snapshot
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a new review by this customer (assume connection is authorized as this customer)
  const product_id = typia.random<string & tags.Format<"uuid">>();
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id,
        title: RandomGenerator.alphabets(10),
        body: RandomGenerator.paragraph()(),
        rating: 5,
      },
    },
  );
  typia.assert(review);

  // 3. Add a snapshot to the review
  const snapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          product_id,
          customer_id: customer.id,
          media_uri: RandomGenerator.alphaNumeric(32),
          caption: "Initial caption",
        },
      },
    );
  typia.assert(snapshot);

  // 4. Update the snapshot's caption and media_uri
  const new_caption = "Updated caption";
  const new_media_uri = RandomGenerator.alphaNumeric(40);
  const updated =
    await api.functional.aimall_backend.customer.reviews.snapshots.update(
      connection,
      {
        reviewId: review.id,
        snapshotId: snapshot.id,
        body: {
          caption: new_caption,
          media_uri: new_media_uri,
        },
      },
    );
  typia.assert(updated);

  // 5. Validate the update: caption and media_uri changed, ids preserved
  TestValidator.equals("snapshot id matches")(updated.id)(snapshot.id);
  TestValidator.equals("review product id")(updated.product_id)(product_id);
  TestValidator.equals("customer id matches")(updated.customer_id)(customer.id);
  TestValidator.equals("caption updated")(updated.caption)(new_caption);
  TestValidator.equals("media URI updated")(updated.media_uri)(new_media_uri);
}
