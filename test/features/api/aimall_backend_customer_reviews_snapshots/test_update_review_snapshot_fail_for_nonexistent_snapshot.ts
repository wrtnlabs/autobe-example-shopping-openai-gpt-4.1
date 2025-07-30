import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Ensure attempting to update a non-existent snapshot attached to an existing
 * review returns a not found error.
 *
 * Business context: Only owners (or admins) can update a snapshot for a review.
 * The system must reject attempts to update a snapshot that does not exist for
 * the given review.
 *
 * Test Steps:
 *
 * 1. Register a customer account (to get customer context).
 * 2. Create a review for a random product (customer ownership).
 * 3. Attempt to update a snapshot using the review's id and a randomly generated,
 *    non-existent snapshotId.
 * 4. Ensure an error is thrown (usually 404 not found/error thrown). Validation:
 *    error is thrown, no snapshot is updated.
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_update_review_snapshot_fail_for_nonexistent_snapshot(
  connection: api.IConnection,
) {
  // 1. Register a customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a review as the registered customer
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "E2E Review for Nonexistent Snapshot Update Test",
        body: "Test review detail body",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Attempt to update a snapshot using a non-existent snapshotId - expect failure
  const randomSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const updateBody = {
    caption: "Updated by E2E test (should fail)",
    media_uri: "https://cdn.example.com/media/fake.jpg",
  } satisfies IAimallBackendSnapshot.IUpdate;
  await TestValidator.error("should throw for non-existent snapshot")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.snapshots.update(
        connection,
        {
          reviewId: review.id,
          snapshotId: randomSnapshotId,
          body: updateBody,
        },
      );
    },
  );
}
