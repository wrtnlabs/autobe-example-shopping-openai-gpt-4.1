import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";

/**
 * Test that a customer cannot delete another user's review snapshot.
 *
 * Business scenario:
 *
 * - Only the review/snapshot owner should be able to delete their own snapshot.
 * - Any attempt by a non-owner should result in a permission denied error.
 *
 * Test workflow:
 *
 * 1. Register customer A (the review snapshot owner).
 * 2. Register customer B (non-owner who will try to delete the snapshot).
 * 3. As A, create a review (required for adding the snapshot).
 * 4. As A, add a snapshot to the review.
 * 5. As B, attempt to delete A's snapshot (should fail with permission error).
 *
 * The test asserts that the system denies the deletion by a non-owner,
 * enforcing strong access control for snapshot deletion.
 */
export async function test_api_aimall_backend_customer_reviews_snapshots_test_delete_review_snapshot_fail_as_nonowner(
  connection: api.IConnection,
) {
  // 1. Register customer A (the owner of review and snapshot)
  const customerAEmail: string = typia.random<string>();
  const customerAPhone: string = typia.random<string>();
  const customerA: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerAEmail,
        phone: customerAPhone,
        password_hash: "passA",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerA);

  // 2. Register customer B (other user who will try the forbidden operation)
  const customerBEmail: string = typia.random<string>();
  const customerBPhone: string = typia.random<string>();
  const customerB: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerBEmail,
        phone: customerBPhone,
        password_hash: "passB",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customerB);

  // 3. (As customer A) Create a review
  // Simulate authentication as customer A if needed by API/app (here, only data ownership is checked)
  const review: IAimallBackendReview =
    await api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string>(),
        title: "Test Review Title",
        body: "Content by customer A.",
        rating: 5,
      } satisfies IAimallBackendReview.ICreate,
    });
  typia.assert(review);

  // 4. (As customer A) Add a snapshot to the review
  const snapshot: IAimallBackendSnapshot =
    await api.functional.aimall_backend.customer.reviews.snapshots.create(
      connection,
      {
        reviewId: review.id,
        body: {
          media_uri: "https://example.com/snapshotA.jpg",
          caption: "Snapshot by customer A",
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 5. (As customer B) Attempt to delete customer A's snapshot - should fail
  // Simulate authentication switching to customer B (if access token model is used)
  await TestValidator.error("non-owner should not be able to delete snapshot")(
    async () => {
      await api.functional.aimall_backend.customer.reviews.snapshots.erase(
        connection,
        {
          reviewId: review.id,
          snapshotId: snapshot.id,
        },
      );
    },
  );
}
