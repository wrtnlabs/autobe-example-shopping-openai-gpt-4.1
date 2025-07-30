import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Validates that attempting to delete a non-existent snapshot for a review
 * fails as expected.
 *
 * This test checks robust error handling for invalid operations to ensure the
 * deletion endpoint correctly returns a not found error when trying to delete a
 * snapshot that does not exist within a known review.
 *
 * Steps:
 *
 * 1. Register a new customer using required customer creation fields.
 * 2. Create a new review as this customer, linking to a random product.
 * 3. Attempt to delete a review snapshot using the known review's id and a
 *    random/fake snapshot UUID.
 * 4. Validate that an error is thrown for the deletion attempt. (Implementation
 *    shows error is thrown, but cannot inspect contents.)
 *
 * Note: As there are no available APIs in the provided materials to inspect the
 * state of the review or its possible snapshots before/after deletion, this
 * test can only confirm that the expected error is thrown (no mutation
 * verification).
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_delete_review_snapshot_fail_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: "010" + typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a new review as this customer
  const review = await api.functional.aimall_backend.customer.reviews.create(
    connection,
    {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Test review for non-existent snapshot scenario",
        body: "Content for snapshot deletion negative test.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    },
  );
  typia.assert(review);

  // 3. Attempt to delete a snapshot that does not exist
  const fakeSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw error for non-existent snapshot deletion",
  )(() =>
    api.functional.aimall_backend.customer.reviews.snapshots.erase(connection, {
      reviewId: review.id,
      snapshotId: fakeSnapshotId,
    }),
  );
}
